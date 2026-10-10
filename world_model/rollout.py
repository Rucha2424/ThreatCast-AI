import torch
import torch.nn as nn


class LatentStatePredictor(nn.Module):

    def __init__(
        self,
        latent_dim=64,
        hidden_dim=64
    ):
        super().__init__()

        self.network = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, latent_dim)
        )

    def forward(self, latent_state):
        return self.network(latent_state)


def autoregressive_rollout(
    predictor,
    initial_state,
    steps=3
):
    if steps < 1:
        raise ValueError(
            "steps must be at least 1."
        )

    if initial_state.ndim == 1:
        current_state = initial_state.unsqueeze(0)
    else:
        current_state = initial_state

    predictions = []

    predictor.eval()

    with torch.no_grad():

        for step in range(steps):

            next_state = predictor(
                current_state
            )

            predictions.append(
                next_state
            )

            current_state = next_state

    return torch.stack(
        predictions,
        dim=1
    )


def rollout_with_history(
    predictor,
    history,
    steps=3
):
    if history.ndim != 3:
        raise ValueError(
            "history must have shape "
            "(batch, sequence, latent_dim)."
        )

    current_state = history[:, -1, :]

    predictions = []

    predictor.eval()

    with torch.no_grad():

        for step in range(steps):

            next_state = predictor(
                current_state
            )

            predictions.append(
                next_state
            )

            current_state = next_state

    return torch.stack(
        predictions,
        dim=1
    )