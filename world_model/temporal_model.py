import torch
import torch.nn as nn


class TemporalTransformer(nn.Module):

    def __init__(
        self,
        input_dim,
        hidden_dim=64,
        num_heads=4,
        num_layers=2,
        dropout=0.1
    ):
        super().__init__()

        self.input_projection = nn.Linear(
            input_dim,
            hidden_dim
        )

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=num_heads,
            dim_feedforward=hidden_dim * 4,
            dropout=dropout,
            batch_first=True,
            activation="gelu"
        )

        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_layers
        )

        self.output_projection = nn.Linear(
            hidden_dim,
            hidden_dim
        )

    def forward(self, x):

        x = self.input_projection(x)

        x = self.transformer(x)

        x = self.output_projection(x)

        return x


class TemporalStateEncoder(nn.Module):

    def __init__(
        self,
        input_dim,
        hidden_dim=64
    ):
        super().__init__()

        self.temporal_model = TemporalTransformer(
            input_dim=input_dim,
            hidden_dim=hidden_dim
        )

    def forward(self, x):

        encoded = self.temporal_model(x)

        return encoded[:, -1, :]