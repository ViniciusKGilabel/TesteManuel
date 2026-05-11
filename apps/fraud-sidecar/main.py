import os
from fastapi import FastAPI, HTTPException
from models.fraud_request import FraudRequest
from models.fraud_response import FraudResponse
from chains.fraud_chain import analyze

app = FastAPI(title="fraud-sidecar", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=FraudResponse)
async def analyze_order(request: FraudRequest) -> FraudResponse:
    try:
        result = await analyze(request)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3005"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
