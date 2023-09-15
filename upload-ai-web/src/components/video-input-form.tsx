import { ChangeEvent, useState, useMemo, FormEvent, useRef } from "react";
import { Label } from "./ui/label";
import { api } from "@/lib/axios";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { fetchFile } from "@ffmpeg/util";
import { getFFmpeg } from "@/lib/ffmpeg";
import { Separator } from "./ui/separator";
import { FileVideo, Upload } from "lucide-react";

type Status = "waiting" | "converting" | "uploading" | "generating" | "success";
const statusMessages = {
  waiting: " Carregar vídeo",
  converting: "Convertendo...",
  uploading: "Carregando...",
  generating: "Transcrevendo...",
  success: "Sucesso!",
};

interface VideoInputFormProps {
  onVideoUpload: (videoId: string) => void;
}

export function VideoInputForm(props: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("waiting");

  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  async function convertVideoToAudio(video: File) {
    console.log("Convert started");

    const ffmpeg = await getFFmpeg();
    await ffmpeg.writeFile("input.mp4", await fetchFile(video));

    // identifica o erro
    // ffmpeg.on("log", (log) => {
    //   console.log(log);
    // });

    ffmpeg.on("progress", (progress) => {
      console.log("Convert progress:" + Math.round(progress.progress * 100));
    });

    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-map",
      "0:a",
      "-b:a",
      "20k",
      "-acodec",
      "libmp3lame",
      "output.mp3",
    ]);

    const data = await ffmpeg.readFile("output.mp3");

    const audioFileBlob = new Blob([data], { type: "audio/mpeg" });
    const audioFile = new File([audioFileBlob], "audio.mp3", {
      type: "audio/mpeg",
    });

    console.log("Convert finished");
    return audioFile;
  }

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget;
    if (!files) {
      return;
    }

    const selectedFile = files[0];
    setVideoFile(selectedFile);
  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    // sempre que um formulário sofre um submit recarrega a tela, aqui está sendo evitado
    event.preventDefault();

    const prompt = promptInputRef.current?.value;

    if (!videoFile) {
      return;
    }

    // converter o vídeo em audio
    setStatus("converting");
    const audioFile = await convertVideoToAudio(videoFile);

    const data = new FormData();
    data.append("file", audioFile);

    setStatus("uploading");
    const response = await api.post("/videos", data);
    const videoId = response.data.video.id;

    setStatus("generating");
    await api.post(`videos/${videoId}/transcription`, {
      prompt,
    });

    setStatus("success");
    props.onVideoUpload(videoId);
  }

  // amarra a alteração dessa variável unicamente quando a sua dependência for alterada.
  const previewUrl = useMemo(() => {
    if (!videoFile) {
      return null;
    }
    setStatus("waiting");
    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
      <label
        htmlFor="video"
        className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-white/5"
      >
        {previewUrl ? (
          <video
            src={previewUrl}
            controls={false}
            className="pointer-events-none absolute inset-0"
          />
        ) : (
          <>
            <FileVideo className="w-4 h-4" />
            Selecione um vídeo
          </>
        )}
      </label>
      <input
        type="file"
        id="video"
        accept="video/mp4"
        className="sr-only"
        onChange={handleFileSelected}
      />
      <Separator />
      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          ref={promptInputRef}
          disabled={status !== "waiting"}
          placeholder="Inclua palavras-chave mencionadas no vídeo separadas por vírgula (,)"
          id="transcription_prompt"
          className="h-20 leading-relaxed resize-none"
        />
      </div>
      <Button
        data-success={status === "success"}
        disabled={status !== "waiting"}
        type="submit"
        className="w-full data-[success=true]:bg-white"
      >
        {status === "waiting" ? (
          <>
            {statusMessages[status]}
            <Upload className="w-4 h-4 ml-4" />
          </>
        ) : (
          statusMessages[status]
        )}
      </Button>
    </form>
  );
}
