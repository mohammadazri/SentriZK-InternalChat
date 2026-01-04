import pandas as pd
import numpy as np
import tensorflow as tf
import logging
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from tensorflow.keras import layers, models, regularizers

# Advanced Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

def train_advanced_model():
    # 1. Load Data
    df = pd.read_csv(r'./DataSet/spam.csv', encoding='latin-1')[['v1', 'v2']]
    df.columns = ['label', 'text']
    
    # Train only on HAM (Normal) data to learn the "Business Baseline"
    train_data = df[df['label'] == 'ham']['text'].sample(n=1500, random_state=42)
    
    # 2. Vectorization (Increased features for better resolution)
    vectorizer = TfidfVectorizer(max_features=200, stop_words='english')
    X = vectorizer.fit_transform(train_data).toarray().astype('float32')
    joblib.dump(vectorizer, 'sentrizk_vectorizer.joblib')

    # 3. Advanced Autoencoder Architecture
    input_dim = X.shape[1]
    model = models.Sequential([
        layers.Input(shape=(input_dim,)),
        layers.Dense(128, activation='relu', kernel_regularizer=regularizers.l2(0.001)),
        layers.Dropout(0.2), # Prevent memorization (Identity Trap)
        layers.Dense(32, activation='relu'),
        layers.Dense(8, activation='relu'),   # TIGHT BOTTLENECK: The Core Intelligence
        layers.Dense(32, activation='relu'),
        layers.Dense(128, activation='relu'),
        layers.Dense(input_dim, activation='sigmoid') 
    ])

    model.compile(optimizer='adam', loss='mse')
    
    # 4. Training with Early Stopping
    logger.info("Training Advanced Sentry Model...")
    model.fit(X, X, epochs=50, batch_size=32, validation_split=0.1, verbose=0)

    # 5. Export to LiteRT
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()
    with open('sentrizk_model.tflite', 'wb') as f:
        f.write(tflite_model)
    logger.info("Advanced Model and Vectorizer Ready.")

if __name__ == "__main__":
    train_advanced_model()