# ThreatCast-AI — Reproducibility Guide

## 1. Purpose

This document defines the reproducible training, calibration, evaluation,
and inference configuration for the CTU13 temporal world-model pipeline.

The objective is to make the experimental configuration explicit so that
the same data splits, preprocessing, model configuration, random seed,
training procedure, calibration procedure, and held-out test protocol can
be reproduced.

The production LSTM early-warning pipeline is separate from the CTU13
temporal world model and is not modified by the CTU13 risk-model training
or calibration procedure.

---

# 2. System Architecture

ThreatCast-AI uses the following temporal world-model pipeline:

    CTU13 temporal telemetry
            |
            v
    30-second temporal states
            |
            v
    12 engineered features
            |
            v
    train-only feature normalization
            |
            v
    5-state temporal history
            |
            v
    64-dimensional latent representation
            |
            v
    Temporal State Encoder
            |
            v
    Current latent state
            |
            v
    Autoregressive latent predictor
            |
            +-------------------+
            |                   |
            v                   v
       Future latent       Risk prediction
       predictions         T+1 / T+2 / T+3
                                |
                                v
                    Scenario-adaptive calibration
                                |
                                v
                       Risk probabilities

The auxiliary MITRE stage head uses the frozen 64-dimensional current latent
representation from the risk world model.

---

# 3. Dataset

## Dataset

CTU13.

The CTU13 temporal telemetry used by the world-model training pipeline
contains the following required columns:

- Scenario
- Timestamp
- Attack_State

plus the 12 model features listed below.

---

# 4. Model Features

The world model uses exactly 12 input features:

1. Flow_Count
2. Total_Packets
3. Total_Bytes
4. Total_Source_Bytes
5. Avg_Duration
6. Avg_Packets_Per_Flow
7. Avg_Bytes_Per_Flow
8. Flow_Count_Change
9. Total_Packets_Change
10. Total_Bytes_Change
11. Total_Source_Bytes_Change
12. Avg_Duration_Change

The feature order must remain unchanged between training, calibration,
evaluation, and production inference.

---

# 5. Temporal Configuration

The temporal configuration is:

| Parameter | Value |
|---|---:|
| Input feature count | 12 |
| History length | 5 states |
| Temporal state duration | 30 seconds |
| Forecast horizon | 3 |
| Forecast outputs | T+1, T+2, T+3 |
| Latent dimension | 64 |

Each training sample contains a chronological history of five temporal
states.

The world model predicts three future latent/risk states.

---

# 6. Risk World-Model Dataset Split

The risk model uses scenario-level isolation.

### Training scenarios

    1, 2, 3, 4, 5, 6, 8, 9, 10, 11

### Validation scenario

    12

### Final held-out test scenario

    13

Scenario 13 is completely held out from:

- model training
- checkpoint selection
- calibration fitting
- calibration threshold selection

Scenario 13 is used only for final evaluation after model and calibration
selection.

This separation prevents the final held-out scenario from influencing
training or model-selection decisions.

---

# 7. Risk-Model Preprocessing

Feature normalization uses training-derived statistics.

The scaler consists of:

    feature_mean.npy
    feature_std.npy

The normalization transformation is:

    normalized_feature =
        (feature - training_mean) / training_std

The normalization statistics must be calculated without using Scenario 13.

The same frozen statistics are reused during inference.

---

# 8. Risk World-Model Configuration

The risk world model uses:

| Parameter | Configuration |
|---|---|
| Random seed | 42 |
| Device | CPU/GPU selected by runtime |
| Input dimension | 12 |
| Sequence length | 5 |
| Latent dimension | 64 |
| Forecast horizon | 3 |
| Epochs | 60 |
| Minimum epochs | 10 |
| Batch size | 32 |
| Optimizer | AdamW |
| Learning rate | 0.0005 |
| Weight decay | 0.0001 |
| Latent loss | MSE |
| Risk loss | BCEWithLogitsLoss |
| Latent loss weight | 0.5 |
| Risk loss weight | 2.0 |
| Positive class weight | 1.0 |
| Gradient clipping | 1.0 |
| Early-stopping patience | 12 |

---

# 9. Risk-Model Sampling

The training dataset uses scenario-balanced weighted random sampling.

Each training sample receives a weight based on the inverse number of
samples belonging to its scenario.

The sampler uses:

    seed = 42

The validation data is not sampled randomly.

Validation uses chronological dataset order with:

    shuffle = False

---

# 10. Risk-Model Checkpoint Selection

The best risk-model checkpoint is selected using:

    validation mean PR-AUC

PR-AUC is calculated independently for:

- T+1
- T+2
- T+3

and the mean across available horizons is used for checkpoint selection.

The final held-out Scenario 13 data is never used for checkpoint selection.

---

# 11. Risk-Model Loss

The total training objective is:

    total_loss =
        0.5 * latent_loss
        +
        2.0 * risk_loss

where:

    latent_loss = MSE(predicted_future_latent,
                      projected_future_features)

and:

    risk_loss = BCEWithLogitsLoss(risk_logits,
                                  future_attack_labels)

The attack positive-class weight is:

    1.0

---

# 12. Risk Training Reproducibility

The risk training implementation initializes:

    Python random seed = 42
    NumPy random seed = 42
    PyTorch random seed = 42

CUDA seeds are also initialized when CUDA is available.

The training configuration is intentionally explicit in the training script.

---

# 13. Risk-Model Artifacts

The risk-model checkpoint directory is:

    world_model/checkpoints/ctu13_risk/

Important artifacts include:

    ctu13_risk_world_model.pt
    feature_projection.pt
    temporal_encoder.pt
    latent_predictor.pt
    risk_head.pt
    feature_mean.npy
    feature_std.npy
    training_metadata.json

The complete model checkpoint is:

    ctu13_risk_world_model.pt

The component checkpoints are provided for inspection and deployment
purposes.

---

# 14. Risk Training Command

Run from the project root:

    cd /d E:\Projects\SIH

Then execute the risk training script using the project's Python environment.

Example:

    python -m world_model.retrain_ctu13_risk_model

The exact module/path should correspond to the current project layout.

The training script itself is the authoritative source for the executable
training configuration.

---

# 15. Auxiliary MITRE Stage Head

The MITRE stage classifier is an auxiliary model operating on the frozen
64-dimensional current latent representation.

The risk world model is not retrained when training the stage head.

The stage head uses weak supervision derived from documented CTU13
scenario/activity mappings.

CTU13 does not provide timestamped ground-truth MITRE tactic labels for
this task.

Therefore:

    stage supervision = weakly supervised

and stage evaluation must not be described as ground-truth MITRE
classification accuracy.

---

# 16. Stage Classes

The stage head predicts three multi-label classes:

1. Discovery
2. Command and Control
3. Impact

The classifier uses multi-label outputs rather than forcing each scenario
into a single primary tactic.

---

# 17. Stage-Head Dataset Split

The stage head uses a separate scenario split:

### Training scenarios

    1, 2, 3, 4, 8, 9

### Validation scenarios

    5, 6, 10, 11

### Final held-out test scenario

    13

Scenario 13 is not used for:

- stage-head training
- validation
- model selection
- threshold selection

It is evaluated only after the stage head has been selected.

---

# 18. Stage-Head Configuration

| Parameter | Value |
|---|---:|
| Seed | 42 |
| Input latent dimension | 64 |
| Hidden dimension | 32 |
| Classes | 3 |
| Dropout | 0.20 |
| Epochs | 60 |
| Batch size | 32 |
| Learning rate | 0.001 |
| Weight decay | 0.0001 |
| Optimizer | AdamW |
| Early stopping patience | 10 |

Architecture:

    Linear(64 -> 32)
          |
       LayerNorm
          |
         GELU
          |
       Dropout(0.20)
          |
    Linear(32 -> 3)

The outputs are converted to probabilities using sigmoid.

---

# 19. Stage-Head Normalization

The stage head uses the existing frozen risk-model training scaler:

    feature_mean.npy
    feature_std.npy

These statistics are derived from the risk-model training data.

Scenario 13 does not influence the stage-head scaler.

This ensures that the frozen world model and auxiliary stage head receive
the same feature representation.

---

# 20. Stage-Head Artifacts

The stage-head artifacts are stored in:

    world_model/checkpoints/ctu13_risk/

Important files:

    ctu13_stage_head.pt
    stage_training_metadata.json

The stage metadata records:

- training configuration
- scenario splits
- selected thresholds
- weak-supervision methodology
- model scope
- held-out Scenario 13 policy

---

# 21. Risk Calibration

Risk calibration is performed separately from neural-model training.

The neural world-model checkpoint is frozen.

Calibration consists of:

    raw risk logits
          |
          v
    scenario-level z-normalization
          |
          v
    frozen Platt transformation
          |
          v
    calibrated probability

The calibration method is:

    scenario_zscore_platt

---

# 22. Calibration Dataset Policy

Calibration is learned using validation Scenario 12.

Scenario 13 labels are never used for:

- calibration fitting
- Platt fitting
- threshold selection

The final calibration layer is refit using all validation data after
out-of-fold calibration is used for threshold selection.

---

# 23. Calibration OOF Procedure

The validation data is divided into:

    4 chronological folds

Out-of-fold calibrated probabilities are generated without retraining the
neural world model.

Only the calibration layer is fitted.

The calibration layer uses logistic regression / Platt scaling.

The random state is:

    42

---

# 24. Calibration Threshold

The threshold is selected independently for each forecast horizon.

The objective is:

    maximize F1

subject to:

    validation FPR <= 0.10

Threshold selection is performed only on out-of-fold validation
probabilities.

The resulting threshold is frozen for final evaluation and inference.

---

# 25. Scenario-Adaptive Calibration

At inference time, raw logits for the complete current scenario are
standardized using:

    scenario_mean
    scenario_std

The transformation is:

    z = (logit - scenario_mean) / scenario_std

If the standard deviation is too small, the implementation uses the
configured numerical fallback.

The frozen Platt parameters are then applied:

    calibrated_score = A * z + B

followed by:

    probability = sigmoid(calibrated_score)

Because the score distribution is normalized using the current scenario,
these probabilities are conditional on the current scenario score
distribution.

They must therefore NOT be described as universally calibrated probabilities
across arbitrary domains.

---

# 26. Calibration Artifact

The frozen calibration artifact is:

    world_model/checkpoints/ctu13_risk/risk_calibration.json

It contains horizon-specific parameters for:

    T+1
    T+2
    T+3

including:

- Platt coefficient
- Platt intercept
- validation score statistics
- test score statistics
- threshold
- validation metrics
- test metrics

---

# 27. Calibration Inference Requirement

The production calibration helper requires all raw logits for a requested
forecast horizon from the current scenario.

A single isolated logit must not be treated as a complete scenario
distribution for z-normalization.

The correct inference sequence is:

    collect all current-scenario raw logits
                 |
                 v
       calibrate each horizon
                 |
                 v
       select latest/current result

---

# 28. Production PCAP Pipeline

The dashboard supports:

    CSV
    PCAP
    PCAPNG
    CAP

For PCAP-family inputs:

    PCAP
      |
      v
    packet parsing
      |
      v
    30-second temporal aggregation
      |
      v
    12-feature temporal representation
      |
      v
    5-state history
      |
      v
    CTU13 risk world model
      |
      v
    calibrated risk forecast
      |
      v
    auxiliary stage head
      |
      v
    packet/feature evidence

PCAP ingestion is an inference/integration capability.

Performance claims on data outside CTU13 must not be presented as CTU13
model-performance results.

---

# 29. Production CSV Pipeline

CSV input follows the temporal telemetry preparation path and feeds the
same world-model inference pipeline.

The production LSTM CSV endpoint remains a separate pipeline.

The CTU13 world model does not replace or retrain the production LSTM.

---

# 30. Scenario 13 Isolation Rule

Scenario 13 is the final held-out scenario.

It must not be used during:

    risk training
    risk checkpoint selection
    risk calibration fitting
    risk threshold selection
    stage-head training
    stage-head validation
    stage-head threshold selection

Scenario 13 is reserved for final evaluation.

Any future experiment that changes these rules must be documented as a
different experimental protocol.

---

# 31. Determinism

The training scripts initialize deterministic random seeds.

Risk model:

    seed = 42

Stage model:

    seed = 42

The stage-head training explicitly enables deterministic PyTorch algorithms.

When GPU training is used, hardware and CUDA/PyTorch versions may affect
bit-level reproducibility even when random seeds are fixed.

Therefore reproducibility should be interpreted as configuration-level and
protocol-level reproducibility rather than a guarantee of identical
floating-point values across all hardware environments.

---

# 32. Evaluation Principle

Evaluation must preserve the scenario-level separation established during
training.

Metrics must be reported against the appropriate held-out data.

For imbalanced infiltration-risk prediction, PR-AUC is an important
threshold-independent metric.

ROC-AUC may also be reported.

Threshold-dependent metrics include:

- Accuracy
- Precision
- Recall
- F1
- False-positive rate
- Confusion matrix

No metric should be presented as a general performance guarantee outside
the evaluation dataset.

---

# 33. Weakly-Supervised Stage Evaluation

Stage predictions are derived from weak labels based on CTU13 activity
mappings.

Therefore stage results should be described using terminology such as:

    weak-label consistency

rather than:

    ground-truth MITRE ATT&CK accuracy

This distinction is important because the CTU13 data does not provide the
required timestamped MITRE ground-truth labels.

---

# 34. Reproducibility Checklist

Before reporting an experiment, verify:

- [ ] Dataset version/path recorded
- [ ] Feature order unchanged
- [ ] Sequence length = 5
- [ ] Forecast horizon = 3
- [ ] Latent dimension = 64
- [ ] Random seed = 42
- [ ] Risk train scenarios recorded
- [ ] Risk validation scenario recorded
- [ ] Scenario 13 remains held out
- [ ] Stage train scenarios recorded
- [ ] Stage validation scenarios recorded
- [ ] Stage Scenario 13 remains held out
- [ ] Training scaler is from training data only
- [ ] Checkpoint selection uses validation only
- [ ] Calibration uses validation data only
- [ ] Threshold selection uses validation OOF predictions only
- [ ] Test data is not used for model selection
- [ ] Calibration artifact is frozen before final test
- [ ] Model checkpoint is recorded
- [ ] Component checkpoints are recorded
- [ ] Training metadata is saved
- [ ] Calibration metadata is saved

---

# 35. Important Scientific Limitations

## CTU13 MITRE labels

The stage head uses weak scenario/activity-derived labels.

It is not trained against timestamped ground-truth MITRE ATT&CK tactic
annotations.

## Scenario-adaptive probabilities

Risk probabilities are scenario-adaptive because current-scenario score
statistics are used during calibration.

They are not universal probability estimates across arbitrary datasets.

## Out-of-domain PCAPs

PCAP files from datasets other than CTU13 are useful for validating the
ingestion and inference software path.

They must not automatically be interpreted as evidence of CTU13 model
accuracy.

## Packet attribution

Packet-level evidence is telemetry evidence.

It must not be described as packet-level SHAP attribution unless a genuine
packet-level attribution method has been implemented and validated.

---

# 36. Artifact Directory

The primary CTU13 risk artifacts are stored under:

    world_model/checkpoints/ctu13_risk/

Expected important artifacts:

    ctu13_risk_world_model.pt
    feature_projection.pt
    temporal_encoder.pt
    latent_predictor.pt
    risk_head.pt
    feature_mean.npy
    feature_std.npy
    training_metadata.json
    risk_calibration.json
    risk_world_model_calibrated_test_results.csv
    risk_world_model_calibrated_evaluation.json
    ctu13_stage_head.pt
    stage_training_metadata.json

---

# 37. Final Reproducibility Statement

ThreatCast-AI's CTU13 temporal world-model experiment is defined by:

    Seed 42
    +
    fixed scenario-level data splits
    +
    12-feature representation
    +
    5-state temporal history
    +
    64-dimensional latent state
    +
    3-step forecast
    +
    validation-based checkpoint selection
    +
    validation-only calibration
    +
    validation-only threshold selection
    +
    held-out Scenario 13 final evaluation

Any experiment that changes one of these components should be treated as a
new experimental configuration and documented separately.