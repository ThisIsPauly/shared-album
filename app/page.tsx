"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type MediaItem = {
  id: string
  filename: string
  storage_path: string
  media_type: string
}

export default function Home() {
  const eventTitle = "Katy's Birthday Album"

  const [files, setFiles] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)

  async function loadFiles() {
    const { data, error } = await supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Load error:", error)
      return
    }

    setFiles(data || [])
  }

  useEffect(() => {
    loadFiles()
  }, [])

  async function uploadFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files
    if (!selected) return

    setUploading(true)

    const fileArray = Array.from(selected)

    for (const file of fileArray) {
      const fileName = `${crypto.randomUUID()}-${file.name}`

      try {
        // Upload file to Storage
        const { error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(fileName, file)

        if (uploadError) {
          console.error("Upload error:", uploadError)
          continue
        }

        // Insert metadata into DB
        const { error: dbError } = await supabase
          .from("media")
          .insert({
            filename: file.name,
            storage_path: fileName,
            media_type: file.type
          })

        if (dbError) {
          console.error("DB error:", dbError)
        }

      } catch (err) {
        console.error("Unexpected error:", err)
      }
    }

    await loadFiles()
    setUploading(false)
    e.target.value = ""
  }

  function getPublicUrl(path: string) {
    return supabase.storage
      .from("uploads")
      .getPublicUrl(path).data.publicUrl
  }

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "system-ui"
      }}
    >

      {/* Header */}
      <div style={{ marginBottom: "25px" }}>
        <h1 style={{ fontSize: "34px", marginBottom: "8px" }}>
          {eventTitle}
        </h1>

        <p style={{ color: "#666" }}>
          Share your photos and videos ✨
        </p>
      </div>

      {/* Upload Button */}
      <div style={{ marginBottom: "25px" }}>
        <label
          style={{
            display: "inline-block",
            padding: "14px 18px",
            background: uploading ? "#666" : "#111",
            color: "#fff",
            borderRadius: "10px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontWeight: 600,
            opacity: uploading ? 0.6 : 1
          }}
        >
          {uploading ? "Uploading..." : "Upload Photos & Videos"}

          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={uploadFiles}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {/* Gallery */}
      <h2 style={{ marginBottom: "15px" }}>Latest Memories</h2>

      {files.length === 0 && (
        <p style={{ color: "#888" }}>
          No photos yet — be the first to upload ✨
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "12px"
        }}
      >
        {files.map((f) => {
          const url = getPublicUrl(f.storage_path)

          return (
            <div
              key={f.id}
              onClick={() => setSelectedMedia(f)}
              style={{
                borderRadius: "12px",
                overflow: "hidden",
                background: "#f5f5f5",
                cursor: "pointer"
              }}
            >
              {f.media_type.startsWith("video") ? (
                <video
                  src={url}
                  style={{ width: "100%", display: "block" }}
                />
              ) : (
                <img
                  src={url}
                  alt={f.filename}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block"
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Lightbox / Viewer */}
      {selectedMedia && (
        <div
          onClick={() => setSelectedMedia(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999
          }}
        >
          <div style={{ maxWidth: "90%", maxHeight: "90%" }}>
            {selectedMedia.media_type.startsWith("video") ? (
              <video
                src={getPublicUrl(selectedMedia.storage_path)}
                controls
                autoPlay
                style={{ maxWidth: "100%", maxHeight: "90vh" }}
              />
            ) : (
              <img
                src={getPublicUrl(selectedMedia.storage_path)}
                style={{ maxWidth: "100%", maxHeight: "90vh" }}
              />
            )}
          </div>
        </div>
      )}

    </main>
  )
}
