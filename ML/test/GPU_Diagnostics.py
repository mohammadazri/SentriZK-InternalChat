import torch
import sys
import time

def test_gpu_sentrizk():
    print("="*50)
    print("   SENTRIZK GPU DIAGNOSTIC TOOL   ")
    print("="*50)

    # 1. BASIC SYSTEM INFO
    print(f"[*] Python Version: {sys.version.split()[0]}")
    print(f"[*] PyTorch Version: {torch.__version__}")
    
    # 2. CUDA CHECK
    cuda_available = torch.cuda.is_available()
    print(f"[*] CUDA Available: {'✅ YES' if cuda_available else '❌ NO'}")

    if not cuda_available:
        print("[!] ERROR: PyTorch cannot see your GPU. Check your NVIDIA drivers.")
        return

    # 3. GPU HARDWARE DETAILS
    device_id = torch.cuda.current_device()
    gpu_name = torch.cuda.get_device_name(device_id)
    props = torch.cuda.get_device_properties(device_id)
    
    print(f"[*] Active GPU: {gpu_name}")
    print(f"[*] Total Memory: {props.total_memory / 1024**3:.2f} GB")
    print(f"[*] Compute Capability: {props.major}.{props.minor}")

    # 4. PERFORMANCE STRESS TEST (Matrix Multiplication)
    print("\n[+] Running Matrix Stress Test on RTX 1060 Ti...")
    
    # Create large matrices directly on GPU
    size = 5000
    device = torch.device("cuda")
    
    try:
        start_time = time.time()
        
        # Initialize tensors on GPU
        a = torch.randn(size, size, device=device)
        b = torch.randn(size, size, device=device)
        
        # Perform matrix multiplication
        # This uses the Tensor Cores/CUDA Cores of your 1060 Ti
        c = torch.matmul(a, b)
        
        # Wait for GPU to finish
        torch.cuda.synchronize()
        
        end_time = time.time()
        print(f"[*] Matrix ({size}x{size}) Multiplied in: {end_time - start_time:.4f} seconds")
        print("[*] Status: GPU COMPUTATION SUCCESSFUL")
        
    except Exception as e:
        print(f"[!] Computation Error: {e}")

    print("="*50)

if __name__ == "__main__":
    test_gpu_sentrizk()