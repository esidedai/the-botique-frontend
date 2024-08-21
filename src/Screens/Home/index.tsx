import React, { useState, useEffect } from "react";
import { FaArrowRight } from "react-icons/fa6";
import axios from "axios";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { IoHome } from "react-icons/io5";

interface Conversation {
  prompt: string;
  response: string;
  isLoading: boolean;
}

const Home: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<string>("");
  const [typedResponse, setTypedResponse] = useState<string>("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  const handleSearch = async () => {
    console.log("Submitting: ", searchTerm);
    setLoading(true);
    setHasSearched(true);
    if (!threadId) {
      try {
        const response = await axios.post(
          "http://localhost:3000/api/new-thread",
          {},
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const newThreadId = response.data.threadId;
        setThreadId(newThreadId);
        console.log("New Thread ID: ", newThreadId);
        await streamConversation(newThreadId, searchTerm);
      } catch (error) {
        console.error("Error creating thread: ", error);
      } finally {
        setLoading(false);
      }
    } else {
      await streamConversation(threadId, searchTerm);
    }
    setSearchTerm("");
    setHasSearched(true);
  };

const streamConversation = async (threadId: string | null, input: string) => {
  setConversations((prevConversations) => [
    ...prevConversations,
    { prompt: input, response: "", isLoading: true },
  ]);

  setTypedResponse("");
  setSearchTerm("");

  try {
    const response = await fetch("http://localhost:3000/api/stream-response", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
    });

    if (!response.body) {
      throw new Error("ReadableStream not supported or no body in response");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let streamedResponse = "";
    let completeMessage = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      streamedResponse += decoder.decode(value, { stream: true });

      const lines = streamedResponse.split('\n');
      streamedResponse = "";

      lines.forEach((line) => {
        if (line.startsWith("data:")) {
          const jsonString = line.replace("data: ", "").trim();
          if (jsonString !== "") {
            try {
              const parsedContent = JSON.parse(jsonString);
              completeMessage += parsedContent.content;

              setTypedResponse(completeMessage);
              setConversations((prevConversations) => {
                return prevConversations.map((conversation) =>
                  conversation.prompt === input
                    ? { ...conversation, response: completeMessage, isLoading: true }
                    : conversation
                );
              });
            } catch (error) {
              console.error("Failed to parse JSON:", error);
            }
          }
        }
      });
    }
    console.log("Complete Message: ", completeMessage);
    setConversations((prevConversations) => {
      return prevConversations.map((conversation) =>
        conversation.prompt === input
          ? { ...conversation, response: completeMessage, isLoading: false }
          : conversation
      );
    });

  } catch (error) {
    console.error("Error during streaming conversation:", error);
  } finally {
    setLoading(false);
  }
};

  
  useEffect(() => {
    if (currentResponse) {
      let index = 0;
      const interval = setInterval(() => {
        if (index < currentResponse.length) {
          setTypedResponse((prev) => (prev || "") + currentResponse[index]);
          index += 1;
        } else {
          clearInterval(interval);
          setTypedResponse(currentResponse || "");
        }
      }, 10);
      return () => clearInterval(interval);
    }
  }, [currentResponse]);

  const continueConversation = async (
    threadId: string | null,
    input: string
  ) => {
    setConversations((prevConversations) => [
      ...prevConversations,
      { prompt: input, response: "", isLoading: true },
    ]);
    setSearchTerm("");
    try {
      const response = await axios.post(
        "http://localhost:3000/api/response",
        { threadId, input },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Prompt: ", input);
      console.log("Response: ", response.data);
      const responseData = response.data.response.value;

      setConversations((prevConversations) => {
        return prevConversations.map((conversation) =>
          conversation.prompt === input
            ? { ...conversation, response: responseData, isLoading: false }
            : conversation
        );
      });
      setCurrentResponse(responseData);
      setTypedResponse("");
    } catch (error) {
      console.error("Error continuing conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentResponse) {
      let index = 0;
      const interval = setInterval(() => {
        if (index < currentResponse.length) {
          setTypedResponse((prev) => prev + currentResponse[index]);
          index += 1;
        } else {
          clearInterval(interval);
          setTypedResponse(currentResponse);
        }
      }, 10);
      return () => clearInterval(interval);
    }
  }, [currentResponse]);

  const handleHomeClick = () => {
    window.location.reload();
    setHasSearched(false);
  };
    return (
      <div className="flex items-center justify-center min-h-screen bg-white px-4">
        <div className="w-full max-w-2xl">
          {!hasSearched ? (
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-black mb-5 bg-custom-gradient">
                Search smarter & faster
              </h1>
              <div className="flex justify-center items-center">
                <input
                  type="text"
                  value={searchTerm}
                  placeholder="Ask anything"
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full py-3 pl-4 pr-20 text-lg text-gray-700 bg-white border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 shadow-[2px_2px_38px_0px_rgba(0,0,0,0.25),0px_-2px_4px_0px_rgba(0,0,0,0.25)_inset,1px_2px_4px_0px_rgba(0,0,0,0.25)_inset]"
                />
                <button
                  onClick={handleSearch}
                  className="flex justify-center items-center w-15 h-15 ml-[-47px] bg-[#333333] text-white text-lg font-bold p-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <FaArrowRight />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative text-center mb-12">
              <div className="sticky top-0 z-10 bg-white shadow text-center flex justify-center">
                <div className="p-4 text-3xl font-bold text-center">
                  <IoHome
                    className="text-3xl text-center cursor-pointer"
                    onClick={handleHomeClick}
                  />
                </div>
              </div>
              {conversations.map((conversation, index) => (
                <div
                  key={index}
                  className="flex justify-center items-center flex-col gap-5 mt-4 mb-0"
                >
                  <div className="w-full flex flex-row gap-2">
                    <div className="font-bold text-lg mb-2 text-left">
                      QUESTION:
                    </div>
                    <p className="text-gray-700 text-base text-left leading-loose">
                      {conversation.prompt}
                    </p>
                  </div>
                  <div className="w-full rounded-lg overflow-y-auto shadow-lg border-2 border-solid border-gray-400 py-2 mt-0 mb-6">
                    <div className="px-6 py-4">
                      <div className="font-bold text-lg mb-2 text-left">
                        ANSWER:
                      </div>
                      <div className="text-gray-700 text-base text-left">
                        <Markdown remarkPlugins={[remarkGfm]}>
                          {conversation.response || typedResponse}
                        </Markdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="relative w-full mt-6">
                <input
                  type="text"
                  value={searchTerm}
                  placeholder="Ask anything"
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full py-3 pl-4 pr-20 text-lg text-gray-700 bg-white border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 shadow-[2px_2px_38px_0px_rgba(0,0,0,0.25),0px_-2px_4px_0px_rgba(0,0,0,0.25)_inset,1px_2px_4px_0px_rgba(0,0,0,0.25)_inset]"
                />
                <button
                  onClick={handleSearch}
                  className="absolute top-13 right-0.5 mt-[-47px] mr-1 flex justify-center items-center w-15 h-15 bg-[#333333] text-white text-lg font-bold p-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <FaArrowRight />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>    
  );
};

export default Home;
