import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, Save, Image as ImageIcon } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Separator } from "@/components/ui/separator";

// Form validation schema
const imageGenerationSchema = z.object({
  prompt: z.string().min(5, "Prompt must be at least 5 characters"),
  size: z.enum(["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]),
  style: z.enum(["vivid", "natural"]),
});

type ImageGenerationFormValues = z.infer<typeof imageGenerationSchema>;

export default function AiImageGenerator() {
  const { toast } = useToast();
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [revisedPrompt, setRevisedPrompt] = useState<string | null>(null);

  // Setup form with validation
  const form = useForm<ImageGenerationFormValues>({
    resolver: zodResolver(imageGenerationSchema),
    defaultValues: {
      prompt: "",
      size: "1024x1024",
      style: "vivid",
    },
  });

  // Image generation mutation
  const generateImageMutation = useMutation({
    mutationFn: async (formData: ImageGenerationFormValues) => {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate image");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedImage(data.imageUrl);
      setRevisedPrompt(data.revisedPrompt);
      toast({
        title: "Image generated successfully",
        description: "Your AI-generated image is now ready.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: ImageGenerationFormValues) => {
    generateImageMutation.mutate(data);
  };

  // Function to save the image
  const saveImage = async () => {
    if (generatedImage) {
      try {
        // Create an anchor element
        const a = document.createElement('a');
        a.href = generatedImage;
        a.download = `ai-generated-image-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        toast({
          title: "Image saved",
          description: "The image has been saved to your device.",
          variant: "default",
        });
      } catch (error) {
        toast({
          title: "Failed to save image",
          description: "There was an error saving the image.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">AI Image Generator</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Generate high-quality images for your water infrastructure visualizations using AI.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form side */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Image Generation Form</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the image you want to generate..."
                        {...field}
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Be specific and detailed about what you want to see in the image.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image Size</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="256x256">Small (256x256)</SelectItem>
                          <SelectItem value="512x512">Medium (512x512)</SelectItem>
                          <SelectItem value="1024x1024">Large (1024x1024)</SelectItem>
                          <SelectItem value="1792x1024">Wide (1792x1024)</SelectItem>
                          <SelectItem value="1024x1792">Tall (1024x1792)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image Style</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vivid">Vibrant and Vivid</SelectItem>
                          <SelectItem value="natural">Natural and Realistic</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={generateImageMutation.isPending}
              >
                {generateImageMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Image...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Generate Image
                  </>
                )}
              </Button>
            </form>
          </Form>
        </Card>

        {/* Result side */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Generated Image</h2>
          
          {generateImageMutation.isPending ? (
            <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed rounded-md">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-gray-500">Generating your image...</p>
              <p className="text-gray-400 text-sm">This may take up to 30 seconds</p>
            </div>
          ) : generatedImage ? (
            <div className="space-y-4">
              <div className="relative rounded-md overflow-hidden border">
                <img 
                  src={generatedImage} 
                  alt="AI Generated" 
                  className="w-full h-auto object-contain"
                />
                <Button
                  onClick={saveImage}
                  className="absolute bottom-4 right-4"
                  size="sm"
                  variant="secondary"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
              
              {revisedPrompt && (
                <div className="mt-4">
                  <Separator className="my-4" />
                  <h3 className="text-sm font-medium mb-2">AI's interpretation:</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {revisedPrompt}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed rounded-md">
              <ImageIcon className="h-10 w-10 text-gray-400 mb-4" />
              <p className="text-gray-500">No image generated yet</p>
              <p className="text-gray-400 text-sm">Fill out the form and click Generate</p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Tips for Great Results</h3>
        <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400">
          <li>Be specific about what you want to see in the image</li>
          <li>Include details about lighting, style, and perspective</li>
          <li>For water infrastructure visualizations, be precise about the type of infrastructure</li>
          <li>Specify the region or environment (rural/urban) for more relevant results</li>
          <li>For technical diagrams, mention "diagram" or "schematic" in your prompt</li>
        </ul>
      </div>
    </div>
  );
}