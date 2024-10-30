from fastapi import WebSocket, WebSocketDisconnect
import json
from llama.ollama import manage_ollama, generate

@app.websocket("/ws/llama")
async def llama_websocket(websocket: WebSocket):
    try:
        await websocket.accept()
        print("connection is OPEN")
        
        # Receive the initial message containing prompts
        data = await websocket.receive_text()
        prompts = json.loads(data)
        
        # Extract prompts from the received JSON
        system_prompt = prompts.get('system_prompt')
        user_prompt = prompts.get('user_prompt')
        
        try:
            response = generate(
                prompt=user_prompt,
                system_prompt=system_prompt
            )
            
            await websocket.send_json({
                "type": "stream",
                "text": response
            })
            
        except Exception as e:
            print(f"Generation error: {str(e)}")
            await websocket.send_json({
                "type": "error",
                "text": str(e)
            })
            
    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        await websocket.close()

@app.websocket("/ws/summarize")
async def summarize_websocket(websocket: WebSocket):
    try:
        await websocket.accept()
        print("Summarize connection is OPEN")
        
        # Receive the transcript
        data = await websocket.receive_text()
        request_data = json.loads(data)
        
        transcript = request_data.get('transcript')
        
        try:
            # You might want to customize the system prompt for summarization
            response = generate(
                prompt=transcript,
                system_prompt="You are a helpful assistant that summarizes interview transcripts. Provide a concise summary with key points and insights."
            )
            
            await websocket.send_json({
                "type": "stream",
                "text": response
            })
            
        except Exception as e:
            print(f"Generation error: {str(e)}")
            await websocket.send_json({
                "type": "error",
                "text": str(e)
            })
            
    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        await websocket.close()