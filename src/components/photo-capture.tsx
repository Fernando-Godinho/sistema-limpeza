"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/display";
import { Icon } from "@/components/icon";
import { useTranslate } from "@/i18n/client";
import type { PhotoKind } from "@/lib/domain";

export type SavedPhoto = { id: string; url: string };

type Stage = "idle" | "live" | "preview" | "uploading" | "saved";

/** Lado maior da imagem depois de reduzida, para subir rapido em conexao fraca. */
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.82;
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Tirar e conferir foto.
 *
 * A foto do servico e tirada na hora, pela camera, e nao pode vir da galeria:
 * e ela que prova como o lugar estava e como ficou. Por isso nao existe
 * "escolher da galeria" aqui.
 *
 * O caminho e sempre o mesmo:
 *   1. um botao grande escrito "Tirar foto";
 *   2. o acesso a camera so e pedido no momento do toque;
 *   3. a imagem aparece para conferir, com "Usar foto" e "Tirar outra";
 *   4. o envio mostra "Enviando foto..." e so entao "Foto salva".
 *
 * A camera do celular so e liberada pelo navegador em conexao segura (https)
 * ou no proprio computador (localhost). Quando ela nao esta disponivel, a tela
 * explica isso em palavras simples em vez de deixar a pessoa tentando.
 *
 * `allowGallery` existe para um caso diferente: a foto do rosto no cadastro,
 * feita pelo gestor no painel, muitas vezes em um computador sem camera.
 */
export function PhotoCapture({
  kind,
  assignmentId,
  targetUserId,
  initialPhoto,
  onSaved,
  required,
  label,
  hint,
  allowGallery,
}: {
  kind: PhotoKind;
  assignmentId?: string | null;
  targetUserId?: string | null;
  initialPhoto?: SavedPhoto | null;
  onSaved?: (photo: SavedPhoto) => void;
  required?: boolean;
  label?: string;
  hint?: string;
  allowGallery?: boolean;
}) {
  const t = useTranslate();
  const [stage, setStage] = useState<Stage>(initialPhoto ? "saved" : "idle");
  const [saved, setSaved] = useState<SavedPhoto | null>(initialPhoto ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    // Sem camera no aparelho, ou fora de conexao segura, nem oferecemos o
    // caminho da camera: explicamos o motivo.
    const supported =
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      window.isSecureContext;
    setCameraReady(Boolean(supported));
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (stage !== "live" || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {
      // Se o navegador recusar o play automatico, a imagem continua no lugar
      // e a pessoa pode tirar a foto mesmo assim.
    });
  }, [stage]);

  async function openCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      setStage("live");
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError(t("photo.permissionDenied"));
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError(t("photo.noCamera"));
      } else {
        setError(t("photo.cameraError"));
      }
    }
  }

  function handleTakePhoto() {
    if (!cameraReady) {
      setError(t("photo.secureNeeded"));
      return;
    }
    void openCamera();
  }

  function shoot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setError(t("photo.cameraError"));
      return;
    }
    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError(t("photo.cameraError"));
          return;
        }
        stopCamera();
        showPreview(blob);
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  }

  function showPreview(blob: Blob) {
    blobRef.current = blob;
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(blob);
    });
    setStage("preview");
    setError(null);
  }

  /** Reduz a imagem escolhida no cadastro antes de enviar. */
  async function shrink(file: File): Promise<Blob> {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas");
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
      );
      if (!blob) throw new Error("encode");
      return blob;
    } catch {
      return file;
    }
  }

  async function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Permite escolher o mesmo arquivo de novo depois de um erro.
    event.target.value = "";
    if (!file) return;
    showPreview(await shrink(file));
  }

  /** O que foi confirmado e enviado ao servidor. */
  async function handleUsePhoto() {
    const blob = blobRef.current;
    if (!blob) {
      setError(t("photo.uploadError"));
      setStage("idle");
      return;
    }

    setStage("uploading");
    setError(null);

    const body = new FormData();
    body.append("file", new File([blob], "foto.jpg", { type: blob.type || "image/jpeg" }));
    body.append("kind", kind);
    if (assignmentId) body.append("assignmentId", assignmentId);
    if (targetUserId) body.append("targetUserId", targetUserId);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    try {
      const response = await fetch("/api/photos", {
        method: "POST",
        body,
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; photo: SavedPhoto }
        | { ok: false; message?: string }
        | null;

      if (!response.ok || !payload || !payload.ok) {
        // A foto continua na tela para a pessoa tentar de novo sem refazer.
        setError(navigator.onLine ? t("photo.uploadError") : t("photo.offline"));
        setStage("preview");
        return;
      }

      setSaved(payload.photo);
      setStage("saved");
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      blobRef.current = null;
      onSaved?.(payload.photo);
    } catch {
      setError(navigator.onLine ? t("photo.uploadError") : t("photo.offline"));
      setStage("preview");
    } finally {
      window.clearTimeout(timer);
    }
  }

  function handleRetake() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    blobRef.current = null;
    setStage("idle");
    setError(null);
  }

  return (
    <div className="stack">
      {allowGallery ? (
        <input
          ref={galleryInputRef}
          className="sr-only"
          type="file"
          accept="image/*"
          onChange={handleFileChosen}
          tabIndex={-1}
        />
      ) : null}

      {label ? (
        <div className="photo-block">
          <h3 className="photo-block__label">{label}</h3>
          {hint ? <p className="photo-block__hint">{hint}</p> : null}
        </div>
      ) : null}

      {error ? (
        <Alert tone="warning" icon={<Icon name="alert" size={28} />}>
          {error}
        </Alert>
      ) : null}

      {!cameraReady && !error ? (
        <Alert tone="info" icon={<Icon name="info" size={28} />}>
          {t("photo.secureNeeded")}
        </Alert>
      ) : null}

      {stage === "live" ? (
        <div className="stack">
          <div className="camera-stage">
            <video ref={videoRef} playsInline muted autoPlay aria-label={t("photo.openCamera")} />
          </div>
          <div className="btn-stack">
            <button type="button" className="btn btn--primary" onClick={shoot}>
              <Icon name="camera" className="btn__icon" />
              {t("photo.take")}
            </button>
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => {
                stopCamera();
                setStage("idle");
              }}
            >
              {t("action.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {stage === "idle" ? (
        <div className="stack">
          {saved ? (
            <PhotoPreview url={saved.url} alt={label ?? t("photo.registered")} />
          ) : (
            <div className="photo-frame">
              <p className="photo-frame__empty">
                <Icon name="image" size={40} />
                {required ? t("photo.missing") : t("photo.none")}
              </p>
            </div>
          )}

          <div className="btn-stack">
            <button type="button" className="btn btn--primary" onClick={handleTakePhoto}>
              <Icon name="camera" className="btn__icon" />
              {saved ? t("photo.takeAnother") : t("photo.take")}
            </button>
            {allowGallery ? (
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => galleryInputRef.current?.click()}
              >
                <Icon name="image" className="btn__icon" />
                {t("photo.fromGallery")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {stage === "preview" ? (
        <div className="stack">
          <p className="field__label">{t("photo.review")}</p>
          <p className="field__hint">{t("photo.reviewHint")}</p>
          {previewUrl ? <PhotoPreview url={previewUrl} alt={t("photo.review")} /> : null}
          <div className="btn-stack">
            <button type="button" className="btn btn--success" onClick={handleUsePhoto}>
              <Icon name="check" className="btn__icon" strokeWidth={3} />
              {t("photo.use")}
            </button>
            <button type="button" className="btn btn--quiet" onClick={handleRetake}>
              <Icon name="camera" className="btn__icon" />
              {t("photo.retake")}
            </button>
          </div>
        </div>
      ) : null}

      {stage === "uploading" ? (
        <div className="stack">
          {previewUrl ? <PhotoPreview url={previewUrl} alt={t("photo.uploading")} /> : null}
          <Alert tone="info" icon={<Icon name="loader" size={28} />}>
            <strong>{t("photo.uploading")}</strong>
          </Alert>
        </div>
      ) : null}

      {stage === "saved" ? (
        <div className="stack">
          {saved ? <PhotoPreview url={saved.url} alt={label ?? t("photo.saved")} /> : null}
          <Alert tone="success" icon={<Icon name="check-circle" size={28} />}>
            <strong>{t("photo.saved")}</strong>
          </Alert>
          <button type="button" className="btn btn--quiet" onClick={handleRetake}>
            <Icon name="camera" className="btn__icon" />
            {t("photo.takeAnother")}
          </button>
        </div>
      ) : null}

      {/* O leitor de tela avisa o andamento do envio em palavras. */}
      <p className="sr-only" role="status" aria-live="polite">
        {stage === "uploading" ? t("photo.uploading") : ""}
        {stage === "saved" ? t("photo.saved") : ""}
      </p>
    </div>
  );
}

function PhotoPreview({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="photo-frame">
      {/* eslint-disable-next-line @next/next/no-img-element -- uma imagem simples, de rota autenticada */}
      <img src={url} alt={alt} />
    </div>
  );
}
