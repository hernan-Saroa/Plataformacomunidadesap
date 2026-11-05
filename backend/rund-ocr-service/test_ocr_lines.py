import unittest
import ast
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock
from concurrent.futures import ThreadPoolExecutor
import threading
from ocr_lines import recognized_page


class LineConfidenceTest(unittest.TestCase):
    def test_preserves_weak_title_line_instead_of_page_average(self):
        lines = [('Universidad', 0.99)] * 20 + [('Título de:', 0.98), ('texto borroso', 0.2)]
        page = recognized_page(lines)
        self.assertGreater(page['confidence'], 0.9)
        self.assertEqual(page['lineas'][-1], {'texto': 'texto borroso', 'confianza': 0.2})
        self.assertEqual(page['text'].splitlines()[-1], 'texto borroso')

    def test_empty_results_are_not_claimed_to_be_confident(self):
        self.assertEqual(recognized_page([]), {'text': '', 'confidence': 0.0, 'lines_detected': 0, 'lineas': []})

    def test_invalid_scores_are_rejected(self):
        for score in [float('nan'), float('inf'), -1, 1.1, None, True, False, '0.99', '1']:
            with self.subTest(score=score), self.assertRaises((ValueError, TypeError)):
                recognized_page([('Economista', score)])
        import numpy as np
        self.assertAlmostEqual(recognized_page([('Economista', np.float32(0.95))])['confidence'], 0.95, places=6)

    def test_rund_adapter_keeps_each_detected_line_score(self):
        # Exercise the actual adapter without starting Paddle or importing its model weights.
        tree = ast.parse(Path(__file__).with_name('legacy-entrypoint.py').read_text(encoding='utf-8'))
        functions = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in ('recognize_image', 'extract_text_with_line_confidence')]
        engine = Mock()
        engine.ocr.return_value = [[([], ('TÍTULO DE:', 0.99)), ([], ('texto borroso', 0.2))]]
        namespace = {'ocr_app': SimpleNamespace(get_ocr_engine=lambda: engine), 'np': Mock(),
                     'preserve_document_image': lambda image: image, 'recognized_page': recognized_page}
        with ThreadPoolExecutor(max_workers=1) as worker:
            namespace['inference_worker'] = worker
            exec(compile(ast.Module(body=functions, type_ignores=[]), 'legacy-entrypoint.py', 'exec'), namespace)
            page = namespace['extract_text_with_line_confidence']('image-fixture')
        self.assertEqual(page['lineas'], [{'texto': 'TÍTULO DE:', 'confianza': 0.99}, {'texto': 'texto borroso', 'confianza': 0.2}])
        engine.ocr.assert_called_once_with('image-fixture', cls=True)

    def test_separate_request_threads_always_use_the_same_predictor_thread(self):
        tree = ast.parse(Path(__file__).with_name('legacy-entrypoint.py').read_text(encoding='utf-8'))
        functions = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in ('recognize_image', 'extract_text_with_line_confidence')]
        predictor_threads, request_threads = [], []
        engine = Mock()
        def predict(*args, **kwargs):
            predictor_threads.append(threading.get_ident())
            return [[([], ('Economista', .95))]]
        engine.ocr.side_effect = predict
        namespace = {'ocr_app': SimpleNamespace(get_ocr_engine=lambda: engine), 'np': Mock(),
                     'preserve_document_image': lambda image: image, 'recognized_page': recognized_page}
        with ThreadPoolExecutor(max_workers=1) as worker, ThreadPoolExecutor(max_workers=2) as requests:
            namespace['inference_worker'] = worker
            exec(compile(ast.Module(body=functions, type_ignores=[]), 'legacy-entrypoint.py', 'exec'), namespace)
            barrier = threading.Barrier(2)
            def request():
                request_threads.append(threading.get_ident())
                barrier.wait(timeout=5)
                return namespace['extract_text_with_line_confidence']('image')
            results = list(requests.map(lambda _: request(), range(2)))
        self.assertEqual(len(set(request_threads)), 2)
        self.assertEqual(len(set(predictor_threads)), 1)
        self.assertNotIn(predictor_threads[0], request_threads)
        self.assertEqual([result['text'] for result in results], ['Economista', 'Economista'])


if __name__ == '__main__':
    unittest.main()
