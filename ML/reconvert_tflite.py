"""
Re-export SentriZK Keras model to pure TFLite (NO Select TF Ops).
By forcing `_experimental_lower_tensor_list_ops = True`, the TensorFlow Lite 
converter will decompose the LSTM operations into basic TFLite ops (FullyConnected, 
Add, Mul, etc.) which are 100% supported by the standard `tflite_flutter` v0.12.
"""
import os
import tensorflow as tf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

keras_path = os.path.join(MODELS_DIR, "sentrizk_model.keras")
tflite_path = os.path.join(MODELS_DIR, "sentrizk_model.tflite")

print(f"Loading Keras model from: {keras_path}")
model = tf.keras.models.load_model(keras_path)
model.summary()

print("\nConverting to Pure TFLite (Builtin ops only)...")
converter = tf.lite.TFLiteConverter.from_keras_model(model)

# Explicitly restrict to ONLY built-in ops
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]

# CRITICAL: This allows LSTMs to be decomposed into basic math ops
# instead of relying on the FlexTensorListReserve op (which requires Select TF Ops)
converter._experimental_lower_tensor_list_ops = True

# Standard optimizations
converter.optimizations = [tf.lite.Optimize.DEFAULT]

try:
    tflite_model = converter.convert()
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
    print(f"\n✅ SUCCESS! Saved pure TFLite model to: {tflite_path}")
    print(f"   Size: {os.path.getsize(tflite_path) / 1024:.1f} KB")
except Exception as e:
    print(f"\n❌ Conversion Failed: {e}")
