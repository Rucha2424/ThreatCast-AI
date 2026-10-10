# ThreatCast-AI Architecture Document (PS26153 Submission)

## 1. System Overview

ThreatCast-AI is an AI-based network attack forecasting system for
PS26153 — "AI-Based Network Attack Forecasting from Network Traffic Data".

The deployed system uses a temporal LSTM early-warning model over
30-second aggregated CTU13 network states. The system predicts whether
an attack is likely to occur within the configured early-warning horizon
using the recent temporal evolution of network traffic.

```text
       CTU13 Flow Records
              |
              v
    30-Second Network States
              |
              v
   12 Engineered Features
              |
              v
     5-State Sliding Window
       (5 x 30 seconds)
              |
              v
       CTU13 LSTM Model
              |
              v
   Early-Warning Probability
              |
        +-----+-----+
        |           |
     NORMAL    EARLY WARNING
        |           |
        +-----+-----+
              |
              v
       SHAP Explainability
              |
              v
       ThreatCast Dashboard