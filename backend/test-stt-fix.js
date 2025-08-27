const http = require("http");

async function testSTT() {
  try {
    console.log("Testing STT endpoint...");

    // Test the health endpoint first
    const healthResponse = await makeRequest("GET", "/health");
    console.log("Health check:", healthResponse.status);

    // Test STT info endpoint
    const infoResponse = await makeRequest("GET", "/api/stt/info");
    console.log("STT info:", infoResponse.status);
    if (infoResponse.status === 200) {
      console.log("STT service info:", JSON.parse(infoResponse.body));
    }
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3001,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          body: data,
          headers: res.headers,
        });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

testSTT();
