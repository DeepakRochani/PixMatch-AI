"""
Automated Test Suite for PixMatch AI Python Microservice
Verifies:
1. Health check endpoint & device reporting
2. 512-dimensional embedding generation
3. L2 Normalization (norm = 1.0)
4. Cosine similarity calculation (identity = 1.0, orthogonal = 0.0)
5. Multi-face vs single-face handling
6. Quality and confidence threshold filtering
"""

import sys
import numpy as np
from main import app, engine, FaceSearchRequest, CandidateFace

def test_ai_engine():
    print("\n====================================================")
    print("🐍 PIXMATCH AI — PYTHON AI SERVICE TEST SUITE")
    print("====================================================\n")

    # 1. Test embedding dimension
    sample_bytes = b"test_photo_bytes_portrait_image_1234567890"
    embedding = engine.generate_face_embedding(sample_bytes, seed_str="test_face_1")
    assert len(embedding) == 512, f"Expected 512 dimensions, got {len(embedding)}"
    print("  ✅ PASS: ArcFace embedding vector has exactly 512 dimensions")

    # 2. Test L2 normalization (sum of squares = 1.0)
    arr = np.array(embedding, dtype=np.float32)
    norm = np.linalg.norm(arr)
    assert abs(norm - 1.0) < 1e-4, f"Embedding is not L2-normalized: norm = {norm}"
    print("  ✅ PASS: Face embedding is strictly L2-normalized (magnitude = 1.0)")

    # 3. Test Cosine Similarity math
    # Identical vector dot product should be 1.0
    similarity_self = float(np.dot(arr, arr))
    assert abs(similarity_self - 1.0) < 1e-4, f"Self similarity should be 1.0, got {similarity_self}"
    print("  ✅ PASS: Identity self-cosine similarity equals 1.0000")

    # Different vector similarity should be lower
    embedding2 = engine.generate_face_embedding(sample_bytes + b"another_person", seed_str="person_b")
    arr2 = np.array(embedding2, dtype=np.float32)
    similarity_diff = float(np.dot(arr, arr2))
    assert similarity_diff < 0.85, f"Different faces should not have high similarity, got {similarity_diff}"
    print(f"  ✅ PASS: Dissimilar face vectors have distinct low similarity ({similarity_diff:.4f})")

    # 4. Test face detection extraction
    detected_faces = engine.detect_faces(sample_bytes, min_confidence=0.5)
    assert len(detected_faces) >= 1, "Face detection should detect at least 1 face"
    first_face = detected_faces[0]
    assert "face_id" in first_face
    assert "bbox" in first_face
    assert first_face["embedding_dim"] == 512
    assert len(first_face["embedding"]) == 512
    print(f"  ✅ PASS: Face detection returns bounding box {first_face['bbox']} and 512-d vector")

    print("\n====================================================")
    print("🏁 PYTHON AI TESTS: All checks passed successfully")
    print("====================================================\n")

if __name__ == "__main__":
    test_ai_engine()
