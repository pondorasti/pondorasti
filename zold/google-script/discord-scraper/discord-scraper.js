// Google Script
// A bot to scrape images from a discord channel and repost them on Slack using Slack Bots and webhooks 

// Slack Bot Webhook
const slackURL = '' // Add Slack webhook
const slackToken = '' // Add bot user OAuth access token

// Discord API
const discordBaseURL = 'https://discordapp.com/api'
const apiVersion = 'v6';
const discordToken = '' // Add Discord personal access token
 
// Discord Server Credentials 
const ftcServerID = '' // Add server id
const designCadID = '' // Add channel id
const filters = 'has=image&has=embed&has=video' // Search field filters


function requestDiscordMessages() {
  
  const discordURL = `${discordBaseURL}/${apiVersion}/guilds/${ftcServerID}/messages/search?channel_id=${designCadID}&${filters}`
  const authorization = { 'authorization' : discordToken }
  const discordOptions = { 'method' : 'get', 'headers' : authorization }
  
  const response = UrlFetchApp.fetch(discordURL, discordOptions).getContentText()
  const json = JSON.parse(response)
  
  const scriptProperties = PropertiesService.getScriptProperties()
  const history = JSON.parse(scriptProperties.getProperty("history"))
  history.splice(0, history.length - 100); // Optimize memory used
  
  for (let sequenceIndex = json.messages.length - 1; sequenceIndex >= 0; sequenceIndex -= 1) {
    for (let messageIndex = 0; messageIndex < json.messages[sequenceIndex].length; messageIndex += 1) {

        const message = json.messages[sequenceIndex][messageIndex]
        
        // Ignore normal messages
        if (message.attachments.length == 0 && message.embeds.length == 0) { continue }
        
        if (!history.includes(message.id)) {
          sendSlackMessage(message)
          history.push(message.id)
          scriptProperties.setProperty("history", JSON.stringify(history))
        }
    }
  }
}

function sendSlackMessage(message, attachment) {

  const authorID = message.author.id
  const avatar = message.author.avatar
  const profilePictureURL = `https://cdn.discordapp.com/avatars/${authorID}/${avatar}.png`
  const username = message.author.username
  
  const messageID = message.id
  const messageDiscordURL = `discord://discordapp.com/channels/${ftcServerID}/${designCadID}/${messageID}`
  const messageWebURL = `https://discordapp.com/channels/${ftcServerID}/${designCadID}/${messageID}`
  
  
  // Content Block
  const rawContent = message.content
  const content = rawContent
  .replace(/[\\]/g, '\\\\\\') // Escape backslash characters
  .replace(/"/g, '\\"') // Escape quote characters
  .replace(/~~/g, '~') // Add strikethrough style
  .replace(/\*\*/g, '_') // Convert bold to underline
  .replace(/\*/g, '_') // Add Italic style
  .replace(/_/g, '*') // Add bold style
  .replace(/>/g, '') // Remove quote style
  .replace(/\n/g, '>') // Add block quote for each line
  const contentBlock = `{"type": "section",
    "text": {
      "type": "mrkdwn",
      "text": ">${content}"
    }
  }`
  
  
  // Basic Blocks: Divider, Author, Source
  const dividerBlock = `{ "type": "divider"}`
  const authorBlock = `{ "type": "context", "elements": [{
    "type": "image",
    "image_url": "${profilePictureURL}",
    "alt_text": "cute cat"
  }, {
    "type": "mrkdwn",
    "text": "*${username}*"
  }]}`
  const sourceBlock = `{ "type": "actions", "elements": [{
    "type": "button",
    "text": {
      "type": "plain_text",
      "text": "Open Desktop App",
      "emoji": true
    },
    "value": "desktop",
    "url": "${messageDiscordURL}",
    "action_id": "desktop"
  }, {
    "type": "button",
    "text": {
      "type": "plain_text",
      "text": "Open Web App",
      "emoji": true
    },
    "value": "web",
    "url": "${messageWebURL}",
    "action_id": "web"
  }]}`
  
  
  // Create image blocks
  let imageBlocks = ""
  const filesToUpload = []
  for (let attachmentIndex = 0; attachmentIndex < message.attachments.length; attachmentIndex += 1) {
    const attachment = message.attachments[attachmentIndex]
    const imageURL = attachment.proxy_url
    const imageName = attachment.filename
    
    if (isVideo(imageURL)) {
      filesToUpload.push(imageURL)
      continue
    }
    
    if (!isImage(imageURL)) { continue }
    
    if (imageBlocks != "") { imageBlocks += "," }
    imageBlocks += `{"type": "image",
      "title": {
        "type": "plain_text",
        "text": "${imageName}"
      },
      "image_url": "${imageURL}",
      "alt_text": "no alt for you"
   }`
   uploadFileToDriveFrom(imageURL)
  }
  
  
  // Create embed blocks
  for (let embedIndex = 0; embedIndex < message.embeds.length; embedIndex += 1) {
    const embed = message.embeds[embedIndex]
    const embedURL = embed.url
    
    if (!isImage(embedURL)) { continue }
    
    if (imageBlocks != "") { imageBlocks += "," }
    imageBlocks += `{"type": "image",
      "title": {
        "type": "plain_text",
        "text": "embed"
      },
      "image_url": "${embedURL}",
      "alt_text": "no alt for you"
   }`
   uploadFileToDriveFrom(embedURL)
  }
  
  // Create payload
  let payload = `{ "blocks": [${dividerBlock}, ${authorBlock}] }`
  payload = payload.slice(0, -3);
  if (content != "") { payload += "," + contentBlock }
  if (imageBlocks != "") { payload += "," + imageBlocks }                            
  payload += "," + sourceBlock + "]}"                          
        
  const options = {
    'method' : 'post',
    'contentType' : 'application/json',
    'payload' :  payload
  }
  
  UrlFetchApp.fetch(slackURL, options)
  for (let index = 0; index < filesToUpload.length; index += 1) {
    uploadFileToSlackFrom(filesToUpload[index])
  }
}

function uploadFileToSlackFrom(url) {
  
  const slackUploadURL = "https://slack.com/api/files.upload"
  const header = { 'authorization' : slackToken }
  
  const video = UrlFetchApp.fetch(url)
  const videoBlob = video.getBlob()
  
  const options = {
    'method'  : 'post',
    'headers' : header,
    'payload' : {
      'file' : videoBlob,
      'channels' : 'G01CEU931R7' 
    }
  }
  
  uploadToDrive(videoBlob)
  UrlFetchApp.fetch(slackUploadURL, options);
} 


// Helper Functions

// Upload a file to Google Drive from an URL 
function uploadFileToDriveFrom(url) {
 const file = UrlFetchApp.fetch(url)
 const fileBlob = file.getBlob()
 uploadToDrive(fileBlob)
}

// Upload a file to Google Drive
function uploadToDrive(file) {
  const folderName = 'Discord Scraper'
  const folder = DriveApp.getFoldersByName(folderName).next();
  folder.createFile(file);
}

// Check if string has an image format 
function isImage(string) {
  const formats = ['.jpg', '.png', '.jpeg', '.gif']
  for (let format of formats) {
    if (string.includes(format)) {
      return true
    }
  }
  
  return false
}

// Check if stringe has a video format
function isVideo(string) {
  const formats = ['.mov', '.mp4']
  for (let format of formats) {
    if (string.includes(format)) {
      return true
    }
  }
  
  return false
}