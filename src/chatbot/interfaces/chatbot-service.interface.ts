export interface ChatbotServiceInterface {
  handleMessage(
    message: string, 
    from: string, 
    chatbotConfig: any
  ): Promise<string>;
} 