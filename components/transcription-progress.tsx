import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function TranscriptionProgress() {
  // Example data - we'll connect this to your API later
  const totalFiles = 20
  const transcribedFiles = 15
  const processingFiles = 3
  const queuedFiles = 2

  const transcribedPercentage = (transcribedFiles / totalFiles) * 100
  const processingPercentage = (processingFiles / totalFiles) * 100

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Transcription Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {transcribedFiles} of {totalFiles} files
            </span>
          </div>
          <div className="h-2 relative rounded-full overflow-hidden bg-muted">
            <div
              className="h-full bg-primary absolute left-0 top-0"
              style={{ width: `${transcribedPercentage}%` }}
            ></div>
            <div
              className="h-full bg-amber-500 dark:bg-amber-600 absolute top-0"
              style={{
                left: `${transcribedPercentage}%`,
                width: `${processingPercentage}%`,
              }}
            ></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="font-medium">{transcribedFiles}</div>
              <div className="text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="font-medium">{processingFiles}</div>
              <div className="text-muted-foreground">Processing</div>
            </div>
            <div>
              <div className="font-medium">{queuedFiles}</div>
              <div className="text-muted-foreground">Queued</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 