import json
from pathlib import Path
import boto3

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
EMBED_MODEL = "amazon.titan-embed-text-v2:0"


def get_embedding(text: str) -> list[float]:
    response = bedrock.invoke_model(
        modelId=EMBED_MODEL,
        body=json.dumps({"inputText": text, "dimensions": 512, "normalize": True}),
    )
    return json.loads(response["body"].read())["embedding"]


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    return sum(a * b for a, b in zip(v1, v2))


class LocalPolicyRetriever:
    def __init__(self, filepath: str = "policies.md"):
        path = Path(filepath)
        if not path.is_absolute():
            path = Path(__file__).resolve().parent / filepath

        content = path.read_text(encoding="utf-8")
        chunks = [c.strip() for c in content.split("## ") if c.strip()]
        if not chunks:
            chunks = [p.strip() for p in content.split("\n\n") if p.strip()]
        if not chunks and content.strip():
            chunks = [content.strip()]

        self.chunks = chunks
        self.embeddings = [get_embedding(chunk) for chunk in self.chunks]

    def retrieve(self, query: str, top_k: int = 2) -> list[dict]:
        if not self.chunks:
            return []
        q_emb = get_embedding(query)
        scored = [
            {"score": round(cosine_similarity(q_emb, emb), 3), "text": chunk}
            for emb, chunk in zip(self.embeddings, self.chunks)
        ]
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]