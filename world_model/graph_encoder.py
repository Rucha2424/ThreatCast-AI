import torch
import torch.nn as nn


class GraphSAGEEncoder(nn.Module):

    def __init__(
        self,
        node_features,
        hidden_dim=64,
        output_dim=64
    ):
        super().__init__()

        self.node_projection = nn.Linear(
            node_features,
            hidden_dim
        )

        self.message_layer = nn.Linear(
            hidden_dim,
            hidden_dim
        )

        self.output_layer = nn.Linear(
            hidden_dim,
            output_dim
        )

        self.activation = nn.ReLU()

    def forward(
        self,
        node_features,
        adjacency
    ):
        x = self.node_projection(
            node_features
        )

        messages = torch.matmul(
            adjacency,
            x
        )

        x = self.activation(
            self.message_layer(messages)
            + x
        )

        x = self.output_layer(x)

        return x


def graph_mean_pool(
    node_embeddings
):
    return node_embeddings.mean(
        dim=0,
        keepdim=True
    )