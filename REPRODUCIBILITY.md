# ThreatCast-AI Reproducibility

## 1. Project

ThreatCast-AI is a temporal network threat prediction system using CTU13
30-second network states and a learned temporal world model.

Project root:

E:\Projects\SIH

Python environment:

E:\Projects\SIH\.venv\Scripts\python.exe

---

## 2. Dataset

Dataset:

CTU13

Preprocessed network-state file:

data/CTU13/all_network_states.csv

The world-model pipeline operates on chronological 30-second network states.

Each temporal state contains 12 model features.

---

## 3. Model Input

Sequence length:

5 states

State duration:

30 seconds

History duration:

150 seconds

Forecast horizon:

3 states

Forecast outputs:

T+1
T+2
T+3

Input shape:

5 × 12

---

## 4. Features

The world model uses exactly these 12 features:

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

No packet-level flags, ports, or deterministic flow scores are used as
additional inputs to the trained world model.

Those signals are exposed separately as evidence/attribution.

---

## 5. World-Model Architecture

The CTU13 risk world model is:

12 input features
        ↓
64-dimensional feature projection
        ↓
TemporalStateEncoder / Temporal Transformer
        ↓
current 64-dimensional latent
        ↓
autoregressive LatentStatePredictor
        ↓
3 future latent states
        ↓
InfiltrationRiskHead
        ↓
T+1 / T+2 / T+3 risk probabilities

The rollout is autoregressive.

At each forecast step:

current latent
    ↓
latent predictor
    ↓
next latent
    ↓
risk head
    ↓
risk logit

The next latent is then used for the following forecast step.

---

## 6. Reproducibility Configuration

Random seed:

42

Device:

CPU

Batch size:

32

Learning rate:

0.0005

Optimizer:

AdamW

Weight decay:

0.0001

Gradient clipping:

1.0

Configured epochs:

60

Early stopping patience:

12

Minimum training epochs:

10

Latent loss:

MSE

Risk loss:

BCEWithLogitsLoss

Latent loss weight:

0.5

Risk loss weight:

2.0

---

## 7. Scenario Split

Training scenarios:

1, 2, 3, 4, 5, 6, 8, 9, 10, 11

Validation scenario:

12

Held-out test scenario:

13

Scenario 13 must not be used for:

- model training
- model selection
- threshold fitting
- calibration fitting
- hyperparameter selection

Scenario 13 is reserved for final held-out evaluation.

---

## 8. Scaling

Feature normalization is fitted using training data only.

The resulting artifacts are stored under:

world_model/checkpoints/ctu13_risk/

Important artifacts include:

feature_mean.npy
feature_std.npy

The same saved normalization parameters are used during inference.

---

## 9. Model Artifacts

Primary checkpoint:

world_model/checkpoints/ctu13_risk/ctu13_risk_world_model.pt

Additional model artifacts:

feature_projection.pt
temporal_encoder.pt
latent_predictor.pt
risk_head.pt

Evaluation artifacts include:

risk_world_model_evaluation.json
risk_world_model_test_results.csv
risk_scenario_analysis.csv
risk_threshold_analysis.csv
training_metadata.json

Calibration artifacts include:

risk_calibration.json
risk_world_model_calibrated_test_results.csv
risk_world_model_calibrated_evaluation.json

---

## 10. Calibration

The production risk output uses the saved calibration configuration.

Calibration is scenario-adaptive.

The calibration procedure uses:

1. raw model logits
2. scenario-level standardization
3. validation-only Platt/sigmoid fitting
4. validation-only threshold selection
5. final held-out Scenario 13 evaluation

Scenario 13 is not used to fit the calibration parameters.

This means calibrated probabilities should be interpreted as
scenario-adaptive risk scores rather than universal probability estimates
across arbitrary traffic distributions.

---

## 11. Baseline Protocol

The apples-to-apples benchmark uses the same:

- CTU13 dataset
- scenario split
- 30-second temporal states
- 5-state history
- 12 model features
- future Attack_State labels
- forecast horizons T+1/T+2/T+3
- training/validation/test separation

Two logistic-regression baselines are evaluated:

### Static baseline

Uses only the latest state:

1 × 12 features

### Temporal baseline

Uses the complete history:

5 × 12 features

The temporal baseline therefore tests whether the five-state history provides
measurable value over a non-temporal classifier using the same feature set.

Thresholds are selected using validation data only and then frozen for
Scenario 13 evaluation.

---

## 12. Persistence Baseline

A persistence baseline is also calculated.

For each horizon, the baseline predicts that the current attack state
continues into the future.

This is a simple non-learned reference model.

Persistence is not trained.

---

## 13. Temporal Improvement Experiment

The temporal experiment compares:

Static Logistic Regression
vs.
Temporal Logistic Regression

using the same:

- train scenarios
- validation scenario
- held-out test scenario
- 12 features
- target labels
- forecast horizons

The key comparison is whether adding the five-state temporal history improves
threshold-independent metrics such as:

- PR-AUC
- ROC-AUC

and validation-selected threshold metrics such as:

- Precision
- Recall
- F1
- FPR

No improvement number is assumed in advance.

The experiment is considered successful only if the measured result supports
an improvement on the held-out evaluation under the defined protocol.

---

## 14. World Model vs Baselines

The final benchmark reports:

- Persistence
- Static Logistic Regression
- Temporal Logistic Regression
- CTU13 Temporal Risk World Model

for:

T+1
T+2
T+3

Metrics:

- PR-AUC
- ROC-AUC
- Precision
- Recall
- F1
- FPR

The benchmark script writes the measured results to CSV and JSON.

---

## 15. Important Scientific Limitations

CTU13 does not provide timestamp-level MITRE ATT&CK stage ground truth.

Therefore the ThreatCast stage head uses weak supervision derived from documented
scenario/activity information.

Packet/flow attribution is deterministic evidence correspondence.

It is not:

- packet-level SHAP
- causal attribution
- a maliciousness probability
- ground-truth packet attribution

The trained world model itself continues to use the defined 12 aggregated
network-state features.

---

## 16. Reproduction Commands
## PCAP Attribution and Model Sensitivity

ThreatCast-AI exposes two distinct PCAP attribution layers.

### 1. Packet / Flow Evidence Attribution

The packet evidence layer uses deterministic packet and flow rules over the uploaded PCAP.

It reports evidence such as:

- TCP SYN packets without observed ACK responses
- repeated SYN behavior
- multiple destination ports contacted by one source
- multiple destination IPs contacted by one source
- TCP reset activity

These rules are evidence heuristics. They are not trained maliciousness classifiers and their scores are not maliciousness probabilities.

### 2. Prediction Input Attribution

Prediction input attribution identifies packet/flow evidence overlapping the exact latest temporal model-input window.

The CTU13 world model consumes:

- 30-second temporal states
- five historical states per prediction
- twelve trained model features

A flow outside the latest five-state input window may therefore appear in global PCAP evidence while not being matched to the current model input window.

### 3. Model Sensitivity Attribution

Model sensitivity uses leave-one-flow-out perturbation.

For each selected directional flow:

1. Remove all packets belonging to that exact directional flow.
2. Keep the original PCAP temporal start and end boundaries.
3. Preserve the original 30-second temporal grid.
4. Preserve empty temporal states created by the removal.
5. Reconstruct the same twelve model features.
6. Run the frozen CTU13 temporal world model.
7. Compare the latest raw T+1/T+2/T+3 logits and probabilities with baseline.

The model weights, scaler, projection, temporal encoder, latent predictor, risk head, calibration parameters, thresholds, training data, and training split are not changed during attribution.

The reported probability delta is:

`without_flow_probability - baseline_probability`

Therefore:

- negative delta = model probability decreased after removing the flow
- positive delta = model probability increased after removing the flow
- approximately zero = little measurable sensitivity

This is model perturbation sensitivity, not causal attribution.

It is not SHAP and it does not estimate the probability that a flow is malicious.

### Temporal-grid preservation

Every ablation uses the same original temporal boundaries as the baseline PCAP.

This prevents an important confounder in which removing packets from the final temporal window would shorten the capture and cause the PCAP adapter to generate fewer temporal states.

The ablation output records:

- `baseline_state_count`
- `ablated_state_count`
- `temporal_grid_preserved`

A successful experiment should preserve the same state count between baseline and ablated captures.

### Reproducible synthetic PCAP validation

The synthetic validation capture contains:

- 11 packets
- 6 temporal states
- 7 directional flows
- 5 deterministic evidence-flagged flows

The expected attribution test is:

- baseline: 6 temporal states
- each flow ablation: 6 temporal states
- 7 analyzed flows
- no ablation should fail merely because trailing empty temporal states were discarded

The test does not establish causal maliciousness. It verifies deterministic attribution behavior and frozen-model perturbation sensitivity.
