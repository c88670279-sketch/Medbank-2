const mongoose = require('mongoose');

const uri = "mongodb+srv://Medbankadmin:mnbvcxz9869%40@cluster0.bnuzt1u.mongodb.net/?appName=Cluster0";

async function check() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected.");
    
    // Check chapters
    const chaptersCollection = mongoose.connection.collection('chapters');
    const physChapters = await chaptersCollection.find({ subject: 'Physiology' }).toArray();
    console.log(`Found ${physChapters.length} physiology chapters in database.`);
    if (physChapters.length > 0) {
      console.log("First 3 chapters:", physChapters.slice(0, 3));
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
