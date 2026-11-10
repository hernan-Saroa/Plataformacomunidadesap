"""Preserve evidence confidence per line for both supported PaddleOCR APIs."""
import math
from numbers import Real


def recognized_page(recognitions):
    lines = []
    for text, raw_score in recognitions:
        if isinstance(raw_score, bool) or not isinstance(raw_score, Real):
            raise ValueError('Invalid OCR line score')
        score = float(raw_score)
        if not isinstance(text, str) or not math.isfinite(score) or not 0 <= score <= 1:
            raise ValueError('Invalid OCR line')
        text = text.strip()
        if text:
            lines.append({'texto': text, 'confianza': score})
    scores = sorted(line['confianza'] for line in lines)
    # Same conservative tenth percentile on both engines; never average away a weak line.
    position = (len(scores) - 1) * 0.1
    lower = math.floor(position)
    confidence = (scores[lower] + (scores[math.ceil(position)] - scores[lower]) * (position - lower)) if scores else 0.0
    return {'text': '\n'.join(line['texto'] for line in lines), 'confidence': confidence,
            'lines_detected': len(lines), 'lineas': lines}
