from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT = Path.cwd()

ROUTE = PROJECT / 'backend' / 'routes' / 'world_model.py'
PCAP_ATTR = PROJECT / 'backend' / 'ml' / 'pcap_attribution.py'
SENS = PROJECT / 'backend' / 'ml' / 'packet_prediction_attribution.py'
FRONT = PROJECT / 'frontend' / 'src' / 'components' / 'worldmodel' / 'WorldModelUpload.jsx'
COMP = PROJECT / 'frontend' / 'src' / 'components' / 'worldmodel' / 'ModelSensitivityAttribution.jsx'

SENS_SOURCE = ROOT / 'packet_prediction_attribution.py'
COMP_SOURCE = ROOT / 'ModelSensitivityAttribution.jsx'


def write_if_needed(src: Path, dst: Path):
    if not src.exists():
        raise SystemExit(f'Missing bundled source: {src}')
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        backup = dst.with_suffix(dst.suffix + '.backup_before_sensitivity')
        if not backup.exists():
            backup.write_text(dst.read_text(encoding='utf-8'), encoding='utf-8')
    dst.write_text(src.read_text(encoding='utf-8'), encoding='utf-8')
    print(f'REPLACED {dst}')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: pattern not found')
    return text.replace(old, new, 1)


if not ROUTE.exists():
    raise SystemExit(f'Missing {ROUTE}')
if not PCAP_ATTR.exists():
    raise SystemExit(f'Missing {PCAP_ATTR}')
if not FRONT.exists():
    raise SystemExit(f'Missing {FRONT}')

# 1. Install the complete backend sensitivity module.
write_if_needed(SENS_SOURCE, SENS)

# 2. Install the standalone frontend sensitivity component.
write_if_needed(COMP_SOURCE, COMP)

# 3. Route: make sure the sensitivity import/call/response are present.
s = ROUTE.read_text(encoding='utf-8')
if 'from backend.ml.packet_prediction_attribution import' not in s:
    marker = 'from backend.ml.pcap_attribution import ('
    if marker in s:
        insert = 'from backend.ml.packet_prediction_attribution import (\n    build_model_sensitivity_attribution,\n)\n\n'
        s = s.replace(marker, insert + marker, 1)
    else:
        raise SystemExit('world_model.py: pcap_attribution import block not found')
if 'model_sensitivity_attribution = None' not in s:
    marker = '        packet_attribution = None\n        prediction_attribution = None\n'
    s = replace_once(
        s,
        marker,
        marker + '        model_sensitivity_attribution = None\n',
        'world_model.py initialization',
    )
if 'build_model_sensitivity_attribution(' not in s:
    marker = '            prediction_attribution = (\n                build_prediction_attribution(\n                    packet_attribution,\n                    dataframe,\n                    sequence_length=SEQUENCE_LENGTH,\n                    window_seconds=30.0,\n                    limit=20,\n                )\n            )\n'
    addition = marker + '\n            model_sensitivity_attribution = (\n                build_model_sensitivity_attribution(\n                    temp_path,\n                    packet_attribution,\n                    limit=10,\n                )\n            )\n'
    s = replace_once(s, marker, addition, 'world_model.py sensitivity call')
if '"model_sensitivity_attribution": (' not in s:
    marker = '            "prediction_attribution": (\n                prediction_attribution\n            ),\n\n'
    addition = marker + '            "model_sensitivity_attribution": (\n                model_sensitivity_attribution\n            ),\n\n'
    s = replace_once(s, marker, addition, 'world_model.py response')
ROUTE.write_text(s, encoding='utf-8')
print(f'UPDATED {ROUTE}')

# 4. Fix prediction-window end timestamp presentation.
s = PCAP_ATTR.read_text(encoding='utf-8')
if 'import pandas as pd' not in s:
    s = s.replace('import math\n', 'import math\n\nimport pandas as pd\n', 1)
s = s.replace('"end_iso": (\n                    str(window_end)\n                ),', '"end_iso": (\n                    pd.Timestamp(window_end, unit="s").isoformat()\n                ),', 1)
PCAP_ATTR.write_text(s, encoding='utf-8')
print(f'UPDATED {PCAP_ATTR}')

# 5. Frontend: import standalone component, read API data, render it.
s = FRONT.read_text(encoding='utf-8')
if 'import ModelSensitivityAttribution from "./ModelSensitivityAttribution";' not in s:
    s = replace_once(
        s,
        'import FlaggedFlowsPanel from "./FlaggedFlowsPanel";\n',
        'import FlaggedFlowsPanel from "./FlaggedFlowsPanel";\nimport ModelSensitivityAttribution from "./ModelSensitivityAttribution";\n',
        'WorldModelUpload import',
    )
if 'const modelSensitivityAttribution =' not in s:
    marker = 'const predictionAttribution =\n'
    idx = s.find(marker)
    if idx < 0:
        raise SystemExit('WorldModelUpload: predictionAttribution declaration not found')
    # Insert immediately before predictionAttribution so no assumptions about its exact body are needed.
    addition = '  const modelSensitivityAttribution =\n    result?.model_sensitivity_attribution ||\n    result?.explainability?.model_sensitivity_attribution ||\n    null;\n\n'
    s = s[:idx] + addition + s[idx:]
if '<ModelSensitivityAttribution' not in s:
    marker = '{inputSource === "pcap" &&\n  predictionAttribution && (\n    <PredictionAttribution\n      attribution={predictionAttribution}\n    />\n  )}'
    if marker in s:
        addition = marker + '\n\n{inputSource === "pcap" &&\n  modelSensitivityAttribution && (\n    <ModelSensitivityAttribution\n      attribution={modelSensitivityAttribution}\n    />\n  )}'
        s = s.replace(marker, addition, 1)
    else:
        # Handle formatting variants by locating the component call.
        call = '<PredictionAttribution'
        start = s.find(call)
        if start < 0:
            raise SystemExit('WorldModelUpload: PredictionAttribution render not found')
        # Find the closing JSX tag after the call and insert after its surrounding conditional is difficult to infer safely.
        raise SystemExit('WorldModelUpload: PredictionAttribution render formatting differs; no unsafe automatic insertion performed')
FRONT.write_text(s, encoding='utf-8')
print(f'UPDATED {FRONT}')

print('INTEGRATION PATCH COMPLETE')
