import torch
import torch.nn.functional as F


def risk_loss(
    predictions,
    targets
):
    return F.binary_cross_entropy_with_logits(
        predictions,
        targets.float()
    )


def mitre_stage_loss(
    predictions,
    targets
):
    return F.cross_entropy(
        predictions,
        targets.long()
    )


def latent_prediction_loss(
    predicted_latent,
    target_latent
):
    return F.mse_loss(
        predicted_latent,
        target_latent
    )


def world_model_loss(
    risk_predictions,
    risk_targets,
    stage_predictions,
    stage_targets,
    predicted_latent,
    target_latent,
    risk_weight=1.0,
    stage_weight=1.0,
    latent_weight=1.0
):
    risk = risk_loss(
        risk_predictions,
        risk_targets
    )

    stage = mitre_stage_loss(
        stage_predictions,
        stage_targets
    )

    latent = latent_prediction_loss(
        predicted_latent,
        target_latent
    )

    total = (
        risk_weight * risk
        + stage_weight * stage
        + latent_weight * latent
    )

    return {
        "total": total,
        "risk": risk,
        "stage": stage,
        "latent": latent
    }