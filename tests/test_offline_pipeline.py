from pathlib import Path

import numpy as np
import pandas as pd
import torch

import demo_app
from backend.ml.inference import FEATURE_NAMES
from backend.ml.input_pipeline import prepare_uploaded_csv
from backend.ml.pcap_adapter import prepare_uploaded_pcap
from world_model.ctu13_risk_inference import (
    FORECAST_HORIZON,
    _load_model,
    _load_normalization,
    predict_world_model_batch,
)
from world_model.stage_inference import predict_stage_with_evidence


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_csv_ingestion_builds_temporal_sequence():
    prepared = prepare_uploaded_csv(
        PROJECT_ROOT / "data" / "CTU13" / "all_network_states.csv",
        scenario=13,
    )

    assert prepared["payload"]["state_count"] >= prepared["payload"]["sequence_length"]
    assert len(prepared["payload"]["sequence"]) == prepared["payload"]["sequence_length"]
    assert len(prepared["payload"]["sequence"][0]) == len(prepared["payload"]["feature_names"])


def test_pcap_ingestion_builds_temporal_sequence():
    prepared = prepare_uploaded_pcap(
        PROJECT_ROOT / "threatcast_flagged_flow_test.pcap",
    )

    assert prepared["payload"]["state_count"] >= prepared["payload"]["sequence_length"]
    assert prepared["pcap_metadata"]["packet_count"] > 0
    assert len(prepared["payload"]["sequence"]) == prepared["payload"]["sequence_length"]


def test_malformed_pcap_has_human_readable_error(tmp_path):
    malformed = tmp_path / "malformed.pcap"
    malformed.write_bytes(b"not a real pcap")

    try:
        prepare_uploaded_pcap(malformed)
    except RuntimeError as exc:
        assert "Unable to read PCAP file" in str(exc)
    else:
        raise AssertionError("Malformed PCAP should fail.")


def test_pcap_with_too_few_states_has_human_readable_error(tmp_path):
    from scapy.all import IP, TCP, Ether, wrpcap

    short_capture = tmp_path / "short.pcap"
    wrpcap(
        str(short_capture),
        [Ether() / IP(src="10.0.0.1", dst="10.0.0.2") / TCP(dport=80)],
    )

    try:
        prepare_uploaded_pcap(short_capture)
    except ValueError as exc:
        assert "temporal states" in str(exc)
        assert "At least" in str(exc)
    else:
        raise AssertionError("Too-short PCAP should fail.")


def test_world_model_rollout_and_stage_mapping():
    prepared = prepare_uploaded_csv(
        PROJECT_ROOT / "data" / "CTU13" / "all_network_states.csv",
        scenario=13,
    )
    sequence = prepared["payload"]["sequence"]

    rollout = predict_world_model_batch([sequence])
    stage = predict_stage_with_evidence(sequence, scenario=13)

    assert rollout["forecast_horizon"] == FORECAST_HORIZON
    assert rollout["model_status"] == "TRAINED_CHECKPOINT_LOADED"
    assert rollout["rollout_is_recursive"] is True
    assert len(rollout["rollout"]) == FORECAST_HORIZON
    assert len(rollout["latent_rollout"]) == FORECAST_HORIZON
    assert all(0.0 <= item["risk_probability"] <= 1.0 for item in rollout["rollout"])
    assert stage["primary_stage"]["name"]
    assert stage["evidence"]["top_distribution_shift_features"]


def test_world_model_rollout_is_recursive():
    model = _load_model()
    current_latent = torch.randn(1, 64)

    with torch.no_grad():
        baseline_rollout = model.rollout_latent(current_latent, forecast_horizon=3)
        altered_first_step = baseline_rollout[:, 0, :] + 0.5
        downstream_from_altered = model.rollout_latent(
            altered_first_step,
            forecast_horizon=2,
        )

    assert not torch.allclose(
        baseline_rollout[:, 1:, :],
        downstream_from_altered,
    )


def test_inference_uses_saved_training_normalization():
    mean, std = _load_normalization()
    prepared = prepare_uploaded_csv(
        PROJECT_ROOT / "data" / "CTU13" / "all_network_states.csv",
        scenario=13,
    )
    sequence = np.asarray(prepared["payload"]["sequence"], dtype=np.float32)
    raw_frame_values = (
        prepared["dataframe"]
        .tail(prepared["payload"]["sequence_length"])[FEATURE_NAMES]
        .to_numpy(dtype=np.float32)
    )

    assert np.array_equal(sequence, raw_frame_values)
    assert mean.shape == (len(FEATURE_NAMES),)
    assert std.shape == (len(FEATURE_NAMES),)
    assert np.all(std > 0)
    assert not np.allclose(sequence.mean(axis=0), mean)


def test_streamlit_analysis_entrypoint_is_import_safe_and_explainable():
    data = (PROJECT_ROOT / "threatcast_flagged_flow_test.pcap").read_bytes()

    result = demo_app.run_analysis(data, "threatcast_flagged_flow_test.pcap", None)

    assert result["source"] == "PCAP"
    assert isinstance(result["timeline"], pd.DataFrame)
    assert len(result["world_model"]["rollout"]) == FORECAST_HORIZON
    assert result["model_status"]["world_model"] == "TRAINED_CHECKPOINT_LOADED"
    assert result["shap"]["feature_contributions"]
    assert result["shap"]["explanation_method"] in {
        "LIVE SHAP GradientExplainer",
        "World-model feature occlusion",
    }
