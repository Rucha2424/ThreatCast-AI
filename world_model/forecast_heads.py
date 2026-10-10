import torch
import torch.nn as nn


class RiskForecastHead(nn.Module):
    def __init__(self, latent_dim=64):
        super().__init__()

        self.network = nn.Sequential(
            nn.Linear(latent_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 1)
        )

    def forward(self, latent_state):
        return self.network(latent_state)


class StageForecastHead(nn.Module):
    def __init__(self, latent_dim=64, num_stages=4):
        super().__init__()

        self.network = nn.Sequential(
            nn.Linear(latent_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, num_stages)
        )

    def forward(self, latent_state):
        return self.network(latent_state)


class WorldModelForecast(nn.Module):
    def __init__(
        self,
        latent_dim=64,
        num_stages=4
    ):
        super().__init__()

        self.risk_head = RiskForecastHead(
            latent_dim=latent_dim
        )

        self.stage_head = StageForecastHead(
            latent_dim=latent_dim,
            num_stages=num_stages
        )

    def forward(self, latent_state):
        risk_logit = self.risk_head(
            latent_state
        )

        stage_logits = self.stage_head(
            latent_state
        )

        return risk_logit, stage_logits


def risk_probability(risk_logit):
    return torch.sigmoid(risk_logit)


if __name__ == "__main__":

    model = WorldModelForecast(
        latent_dim=64,
        num_stages=4
    )

    test_state = torch.randn(1, 64)

    risk, stage = model(test_state)

    probability = risk_probability(risk)

    print("=" * 70)
    print("THREATCAST - FORECAST HEAD VALIDATION")
    print("=" * 70)

    print(f"Input latent state: {tuple(test_state.shape)}")
    print(f"Risk output: {tuple(risk.shape)}")
    print(f"Risk probability: {tuple(probability.shape)}")
    print(f"Stage output: {tuple(stage.shape)}")

    print()
    print("Forecast heads: OK")