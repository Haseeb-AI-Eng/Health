import sys
try:
    import main
    print("✅ Backend syntax OK")
    print("✅ All imports successful")
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
