// Google Script
// Gmail: Mark archived email as read

function markArchivedAsRead() {
    var threads = GmailApp.search('label:unread -label:inbox', 0, 100);
    GmailApp.markThreadsRead(threads);
};