"""Convierte una imagen generada en ComfyUI en un material repetible (color, normales y rugosidad).

Uso: python hacer_repetible.py <entrada.png> <salida_sin_extension> [--tam 1024] [--relieve 6]
        [--rug-min 0.6] [--rug-max 0.92]

Pasos:
1. Para cada eje busca el corte L (entre el 75 % y el final) cuya franja siguiente se parezca más
   al principio de la imagen, recorta ahí y funde una franja del inicio con la continuación.
   Así la imagen enlaza consigo misma sin el "fantasma" de un fundido a ciegas.
2. Deriva una altura de la luminancia (paso alto con desenfoque periódico por FFT) y de ella
   las normales (convención OpenGL, la de three.js) y la rugosidad.
Guarda <salida>_diff.jpg, <salida>_nor_gl.jpg y <salida>_rough.jpg.
"""
import argparse

import numpy as np
from PIL import Image


def mejor_corte(img: np.ndarray, eje: int, banda: int) -> int:
    n = img.shape[eje]
    inicio = np.take(img, range(banda), axis=eje)
    mejor, error_min = n - banda, np.inf
    for corte in range(int(n * 0.75), n - banda + 1):
        franja = np.take(img, range(corte, corte + banda), axis=eje)
        error = float(np.mean((franja - inicio) ** 2))
        if error < error_min:
            mejor, error_min = corte, error
    return mejor


def enlazar(img: np.ndarray, eje: int, banda: int) -> np.ndarray:
    corte = mejor_corte(img, eje, banda)
    salida = np.take(img, range(corte), axis=eje).copy()
    continuacion = np.take(img, range(corte, corte + banda), axis=eje)
    original = np.take(img, range(banda), axis=eje)
    forma = [1, 1, 1]
    forma[eje] = banda
    t = np.linspace(0, 1, banda).reshape(forma)
    t = t * t * (3 - 2 * t)
    mezcla = continuacion * (1 - t) + original * t
    if eje == 0:
        salida[:banda] = mezcla
    else:
        salida[:, :banda] = mezcla
    return salida


def desenfoque_periodico(canal: np.ndarray, sigma: float) -> np.ndarray:
    alto, ancho = canal.shape
    fy = np.fft.fftfreq(alto)[:, None]
    fx = np.fft.fftfreq(ancho)[None, :]
    filtro = np.exp(-2 * (np.pi * sigma) ** 2 * (fx**2 + fy**2))
    return np.real(np.fft.ifft2(np.fft.fft2(canal) * filtro))


def aplanar_luz(img: np.ndarray) -> np.ndarray:
    """Quita los degradados de luz grandes de la foto generada (si no, se ven bandas al repetir)."""
    lum = img @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    margen = img.shape[0] // 4
    ampliada = np.pad(lum, margen, mode="reflect")
    fondo = desenfoque_periodico(ampliada, img.shape[0] / 6)[margen:-margen, margen:-margen]
    factor = float(lum.mean()) / np.maximum(fondo, 1e-3)
    return np.clip(img * factor[..., None], 0, 1)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("entrada")
    p.add_argument("salida")
    p.add_argument("--tam", type=int, default=1024)
    p.add_argument("--relieve", type=float, default=6.0)
    p.add_argument("--rug-min", type=float, default=0.6)
    p.add_argument("--rug-max", type=float, default=0.92)
    a = p.parse_args()

    img = np.asarray(Image.open(a.entrada).convert("RGB"), dtype=np.float32) / 255
    img = aplanar_luz(img)
    banda = img.shape[0] // 12
    img = enlazar(img, 0, banda)
    img = enlazar(img, 1, banda)
    color = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).resize((a.tam, a.tam), Image.LANCZOS)
    color.save(a.salida + "_diff.jpg", quality=88)

    rgb = np.asarray(color, dtype=np.float32) / 255
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    altura = lum - desenfoque_periodico(lum, a.tam / 24)
    altura = desenfoque_periodico(altura, 0.8)
    altura = (altura - altura.min()) / (np.ptp(altura) + 1e-6)

    dx = (np.roll(altura, -1, axis=1) - np.roll(altura, 1, axis=1)) * a.relieve
    dy = (np.roll(altura, -1, axis=0) - np.roll(altura, 1, axis=0)) * a.relieve
    normal = np.dstack([-dx, dy, np.ones_like(altura)])
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    Image.fromarray(((normal * 0.5 + 0.5) * 255).astype(np.uint8)).save(a.salida + "_nor_gl.jpg", quality=92)

    rug = a.rug_max - (a.rug_max - a.rug_min) * altura
    Image.fromarray((rug * 255).astype(np.uint8)).save(a.salida + "_rough.jpg", quality=90)
    print(a.salida, "listo")


if __name__ == "__main__":
    main()
