import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PromptLlama() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Prompt Llama</CardTitle>
        <CardDescription>Configure your system and user prompts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="system-prompt">System Prompt</Label>
          <Textarea
            id="system-prompt"
            placeholder="Enter system prompt..."
            className="min-h-[100px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-prompt">User Prompt</Label>
          <Textarea
            id="user-prompt"
            placeholder="Enter user prompt..."
            className="min-h-[100px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
