const feedQueue = require('./queue');
const feedparser = require('./parser');
const storage = require('../utils/storage');
const { logger } = require('../utils/logger');

const Post = require('../post');

exports.workerCallback = async function(job) {
  const { url } = job.data;
  const posts = await feedparser(url);
  const processedPosts = await Promise.all(
    posts.map(async post => {
      // TODO: run this through text parser and sanitizer
      return new Post(
        post.author,
        post.title,
        post.description,
        'textContent',
        new Date(post.date),
        new Date(post.pubDate),
        post.link,
        post.guid
      );
    })
  );
  return processedPosts;
};

exports.start = async function() {
  // Start processing jobs from the feed queue...
  feedQueue.process(exports.workerCallback);
  feedQueue.on('completed', async (job, results) => {
    try {
      await Promise.all(results.map(result => storage.addPost(result)));
    } catch (err) {
      logger.error({ err }, 'Error inserting posts into database');
    }
  });
};
