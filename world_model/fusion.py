import torch
import torch.nn as nn


class ThreatFusion(nn.Module):

    def __init__(
        self,
        flow_dim=64,
        packet_dim=64,
        hidden_dim=64
    ):
        super().__init__()

        self.flow_projection = nn.Linear(
            flow_dim,
            hidden_dim
        )

        self.packet_projection = nn.Linear(
            packet_dim,
            hidden_dim
        )

        self.fusion = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim)
        )

        self.risk_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )

    def forward(
        self,
        flow_embedding,
        packet_embedding
    ):

        flow = self.flow_projection(
            flow_embedding
        )

        packet = self.packet_projection(
            packet_embedding
        )

        combined = torch.cat(
            [flow, packet],
            dim=-1
        )

        fused = self.fusion(
            combined
        )

        risk_logit = self.risk_head(
            fused
        )

        risk_probability = torch.sigmoid(
            risk_logit
        )

        return fused, risk_logit, risk_probability