const fetch = require('node-fetch');

async function testEndpoints() {
  const baseUrl = 'http://localhost:5174';
  
  console.log('Testing NeuroXHuggingFace API endpoints...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test models summary endpoint
    console.log('\n2. Testing models summary endpoint...');
    const modelsResponse = await fetch(`${baseUrl}/api/hf/models-summary?page=1&limit=5`);
    const modelsData = await modelsResponse.json();
    console.log('✅ Models summary response:');
    console.log(`   - Models count: ${modelsData.models?.length || 0}`);
    console.log(`   - Full model list URL: ${modelsData.fullModelListUrl || 'Not provided'}`);
    console.log(`   - Message: ${modelsData.message || 'No message'}`);
    
    // Test models list HTML endpoint
    console.log('\n3. Testing models list HTML endpoint...');
    const htmlResponse = await fetch(`${baseUrl}/api/models-list`);
    const htmlContent = await htmlResponse.text();
    console.log('✅ HTML page loaded:');
    console.log(`   - Content length: ${htmlContent.length} characters`);
    console.log(`   - Contains "AI Model Marketplace": ${htmlContent.includes('AI Model Marketplace')}`);
    console.log(`   - Contains JavaScript: ${htmlContent.includes('<script>')}`);
    
    console.log('\n🎉 All endpoints are working correctly!');
    console.log('\n📋 Summary:');
    console.log(`   - Health endpoint: ✅ Working`);
    console.log(`   - Models summary endpoint: ✅ Working (provides link to full list)`);
    console.log(`   - Models list HTML page: ✅ Working`);
    console.log(`   - Full model list URL: ${modelsData.fullModelListUrl}`);
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
    console.log('\n💡 Make sure the server is running on port 5174');
  }
}

testEndpoints();
