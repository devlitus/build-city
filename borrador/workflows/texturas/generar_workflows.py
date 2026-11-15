"""Genera un workflow de ComfyUI (formato API) por cada textura de recetas.json.

Uso: python generar_workflows.py [nombre ...]   (sin nombres: todas)
"""
import json
import sys
from pathlib import Path

AQUI = Path(__file__).parent


def workflow(nombre: str, receta: dict, base: str, negativo: str) -> dict:
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "qwen_image_2512_fp8_e4m3fn.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": "Qwen-Image-2512-Lightning-4steps-V1.0-fp32.safetensors", "strength_model": 1}},
        "3": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["2", 0], "shift": 3.1}},
        "4": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default"}},
        "5": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_vae.safetensors"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 0], "text": base + receta["prompt"]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 0], "text": negativo}},
        "8": {"class_type": "EmptySD3LatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
        "9": {"class_type": "KSampler", "inputs": {"model": ["3", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["8", 0],
                                                    "seed": receta["semilla"], "steps": 4, "cfg": 1, "sampler_name": "euler", "scheduler": "simple", "denoise": 1}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["9", 0], "vae": ["5", 0]}},
        "11": {"class_type": "SaveImage", "inputs": {"images": ["10", 0], "filename_prefix": f"raices/texturas/{nombre}"}},
    }


def main() -> None:
    datos = json.loads((AQUI / "recetas.json").read_text(encoding="utf-8"))
    nombres = sys.argv[1:] or list(datos["texturas"])
    for nombre in nombres:
        wf = workflow(nombre, datos["texturas"][nombre], datos["base"], datos["negativo"])
        (AQUI / f"{nombre}.json").write_text(json.dumps(wf, indent=2), encoding="utf-8")
        print(nombre)


if __name__ == "__main__":
    main()
