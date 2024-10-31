from fastapi import WebSocket, WebSocketDisconnect
import json
from llama.ollama import manage_ollama, generate

@app.websocket("/ws/transcribe")
async def transcribe_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        # Receive the file from the WebSocket
        file_data = await websocket.receive_bytes()
        
        # Process the file (similar to the /transcribe/ endpoint)
        file_size = len(file_data)
        file_size_mb = file_size / (1024 * 1024)
        await websocket.send_json({"status": "received", "file_size": f"{file_size_mb:.2f} MB"})

        # Save the file temporarily
        timestamp = int(time.time())
        session_filename = f"{timestamp}_uploaded_file"
        file_path = os.path.join(UPLOAD_FOLDER, session_filename)

        with open(file_path, "wb") as buffer:
            buffer.write(file_data)

        # Define a progress callback
        async def progress_callback(message):
            await websocket.send_json({"status": "progress", "message": message})

        # Process the file using your TranscriptionPipeline
        pipeline = TranscriptionPipeline(output_folder=OUTPUT_FOLDER, progress_callback=progress_callback)
        results = await pipeline.process(file_path)

        # Clean up
        os.remove(file_path)

        # Send the final results
        await websocket.send_json({"status": "complete", "Results": results})

    except Exception as e:
        logger.error(f"Error processing file: {str(e)}", exc_info=True)
        await websocket.send_json({"status": "error", "message": str(e)})
    finally:
        await websocket.close()


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