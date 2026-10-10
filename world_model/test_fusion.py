import torch

from fusion import ThreatFusion


def main():

    flow_embedding = torch.randn(1, 64)

    packet_embedding = torch.randn(1, 64)

    model = ThreatFusion(
        flow_dim=64,
        packet_dim=64,
        hidden_dim=64
    )

    fused, risk_logit, risk_probability = model(
        flow_embedding,
        packet_embedding
    )

    print("=" * 60)
    print("THREATCAST FLOW + PACKET FUSION TEST")
    print("=" * 60)

    print(
        "Flow embedding:",
        tuple(flow_embedding.shape)
    )

    print(
        "Packet embedding:",
        tuple(packet_embedding.shape)
    )

    print(
        "Fused representation:",
        tuple(fused.shape)
    )

    print(
        "Risk logit:",
        tuple(risk_logit.shape)
    )

    print(
        "Risk probability:",
        tuple(risk_probability.shape)
    )

    assert fused.shape == (1, 64)
    assert risk_logit.shape == (1, 1)
    assert risk_probability.shape == (1, 1)

    assert 0 <= risk_probability.item() <= 1

    print()
    print("Flow + Packet fusion: OK")


if __name__ == "__main__":
    main()