// extraction dictionary key constants - same as template tags
const KEY_ROLE = "||VOLUNTEER ROLE||";
const KEY_NAME = "||VOLUNTEER NAME||";
const KEY_EMAIL = "||VOLUNTEER EMAIL||";
// -----------  TEST INFO  -----------
// -----------------------------------
const test_params = DocumentApp.openById("1iqCTejm6Nb1L-WzUyM30n9zlPYBpQKEEhSscQpmnnbY").
                              getBody().getText();
const email_pattern = /SENDEREMAIL:(.*)\n/g;
const template_pattern = /TEMPLATEID:(.*)\n/g;
const TEMPLATE_ID_TEST = template_pattern.exec(test_params)[1];
const SENDER_TEST = email_pattern.exec(test_params)[1];
var matches_test = [];
// ---------  END TEST INFO  ---------
// -----------------------------------
// template doc id numbers
const TEMPLATE_ID_VOLMATCH = null;
const TEMPLATE_ID_BENEVITY = null;
const TEMPLATE_ID_IDEALIST = null;
const TEMPLATE_ID_GIFTPULSE = null;
// subject search string constants
const SUBJ_SEARCH_VOLMATCH = "Someone wants to help: ";
const SUBJ_SEARCH_BENEVITY = "";
const SUBJ_SEARCH_IDEALIST = "";
const SUBJ_SEARCH_GIFTPULSE = "";
// sender search string constants
const SENDER_VOLMATCH = "noreply@volunteermatch.org";
const SENDER_BENEVITY = "";
const SENDER_IDEALIST = "";
const SENDER_GIFTPULSE = "";
// extraction dictionary constants - used to find role, name, and email based on
// what substrings bracket the desired string (i.e. come before and after it)
const EXTR_VOLMATCH = {};
EXTR_VOLMATCH[KEY_ROLE] = /Title: (.*)\n/g;
EXTR_VOLMATCH[KEY_NAME] = /Name: (.*)\n/g;
EXTR_VOLMATCH[KEY_EMAIL] = /Email: (.*)\n/g;
// for storing emails matching each source
var matches_VolMatch = [];
var matches_Benevity = [];
var matches_Idealist = [];
var matches_GiftPulse = [];

// get all new volunteer notification emails from inbox, and
// save the ones that haven't been responded to yet
function getNewMatches(match_array, subject_search_str, sender_search_str) {
  var threads = GmailApp.search("from:" + sender_search_str +
                                         " subject:\"" + subject_search_str + "\"" +
                                         " is:unread");
  for (t = 0; t < threads.length; t++) {
    match_array.push(threads[t]);
  }
}

// SUBROUTINE: Given a message and an extraction dictionary, return a
// dictionary of values w/ same keys as the extraction dictionary
function extractFromMessage(message, extr_dict) {
  var values_dict = {};
  var keys = Object.keys(extr_dict);
  for (k = 0; k < keys.length; k++) {
    // find and return a value from the message, based on
    // the substrings that bracket the value
    var search_pattern = extr_dict[keys[k]];
    values_dict[keys[k]] = search_pattern.exec(message.getPlainBody())[1];
  }
  return values_dict;
}

// Auto-reply to emails, given an array of message objs, a
// template id, and an extraction dictionary
function autoReply(matches, template_doc_id, extr_dict) {
  // retrieve the template doc based on its ID
  var template = DocumentApp.openById(template_doc_id);
  // for each message, perform all replacements in replacement dict
  for (m = 0; m < matches.length; m++) {
    var message_to_reply_to = matches[m].getMessages()[0];
    var volunteer_info = extractFromMessage(message_to_reply_to, extr_dict);
    // load the template text
    var response_body = template.getBody().getText();
    // perform replacement of the template tags
    var keys = Object.keys(extr_dict);
    for (k = 0; k < keys.length; k++) {
      response_body = response_body.replaceAll(keys[k], volunteer_info[keys[k]]);
    }
    var auto_email_to_volunteer = GmailApp.createDraft(volunteer_info[KEY_EMAIL],
                                                       volunteer_info[KEY_NAME],
                                                       response_body);
    auto_email_to_volunteer.send();
    message_to_reply_to.star();
    message_to_reply_to.markRead();
  }
}

// TEST
function test() {
  // get new Volunteer Match new volunteer notifications
  getNewMatches(matches_test, SUBJ_SEARCH_VOLMATCH, SENDER_TEST);
  // auto-reply to Volunteer Match new volunteer notifications
  autoReply(matches_test, TEMPLATE_ID_TEST, EXTR_VOLMATCH);
}

test();