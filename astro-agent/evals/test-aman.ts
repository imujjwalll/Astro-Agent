async function runTest() {
  console.log("🚀 Testing Aman's Chart Generation...");
  const threadId = "aman-test-" + Date.now();
  
  const message = "My name is Aman Kumar. I was born on 02 June 2004 at 01:32 AM in Gaya, Bihar, India. Please generate my full chart, houses, career insights, relationship insights, and daily transits.";
  
  try {
    const response = await fetch("http://localhost:3001/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, threadId }),
    });
    
    if (!response.body) throw new Error("No response body");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      
      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const data = JSON.parse(line.slice(5).trim());
            if (data.content) {
              process.stdout.write(data.content);
            } else if (data.message) {
              console.log("\n\n❌ Stream Error Intercepted:", data.message);
            } else if (data.tool) {
              console.log(`\n\n🔧 Tool running: ${data.tool}\n`);
            }
          } catch(e) {}
        }
      }
    }
    console.log("\n\n✅ Stream completed successfully!");
  } catch (err) {
    console.error("Test failed:", err);
  }
}
runTest();
