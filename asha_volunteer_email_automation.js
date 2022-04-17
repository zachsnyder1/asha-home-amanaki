const test_params = DocumentApp.openById("1iqCTejm6Nb1L-WzUyM30n9zlPYBpQKEEhSscQpmnnbY").
                              getBody().getText();
var email_pattern = /SENDEREMAIL:(.*)\n/g;
var template_pattern = /TEMPLATEID:(.*)\n/g;
var outdoc_pattern = /OUTDOC:(.*)\n/g;
const TEMPLATE_ID_TEST = template_pattern.exec(test_params)[1];
const SENDER_TEST = email_pattern.exec(test_params)[1];
const OUTDOC_TEST = outdoc_pattern.exec(test_params)[1];

/**
 * Abstract Class VolunteerSite.
 *
 * @class VolunteerSite
 */
class VolunteerSite {
  // set template tag constants (also used in extraction dictionaries as keys)
  constructor() {
    this.key_role = "||VOLUNTEER ROLE||";
    this.key_name = "||VOLUNTEER NAME||";
    this.key_email = "||VOLUNTEER EMAIL||";
    this.extraction_dict = {};
    this.values_dict = {};
    this.subj_search = null;
    this.sender_search = null;
    this.matches = [];
    this.template_doc_id = null;
    this.site_name = null;
  }
  // METHOD: get new email matches, based on sender and subject
  getNewMatches() {
    var searchops = "from:" + this.sender_search +
                                           " subject:\"" + this.subj_search + "\"" +
                                           " is:unread";
    var threads = GmailApp.search(searchops);
    var t = 0;
    for (t = 0; t < threads.length; t++) {
      this.matches.push(threads[t]);
    }
  }
  // METHOD: Given a message, extract values
  extractFromMessage(message) {
    var keys = Object.keys(this.extraction_dict);
    var k = 0;
    for (k = 0; k < keys.length; k++) {
      // find and return a value from the message, based on
      // the substrings that bracket the value
      var search_pattern = this.extraction_dict[keys[k]];
      this.values_dict[keys[k]] = search_pattern.exec(message.getPlainBody())[1];
    }
  }
}

/**
 * Concrete Class VolunteerSiteNoSeparateAuth.
 *
 * @class VolunteerSiteNoSeparateAuth
 */
class VolunteerSiteNoSeparateAuth extends VolunteerSite {
  constructor() {
    super();
  }
  // METHOD: Auto-reply to matched messages
  autoReply() {
    // retrieve the template doc based on its ID
    var template = DocumentApp.openById(this.template_doc_id);
    // for each message, perform all replacements in replacement dict
    var m = 0;
    for (m = 0; m < this.matches.length; m++) {
      var message = this.matches[m].getMessages()[0];
      this.extractFromMessage(message);
      // load the template text
      var response_body = template.getBody().getText();
      // perform replacement of the template tags
      var keys = Object.keys(this.extraction_dict);
      var k = 0;
      for (k = 0; k < keys.length; k++) {
        response_body = response_body.replaceAll(keys[k], this.values_dict[keys[k]]);
      }
      var auto_email_to_volunteer = GmailApp.createDraft(this.values_dict[this.key_email],
                                                         this.values_dict[this.key_name],
                                                         response_body);
      auto_email_to_volunteer.send();
      message.star();
      message.markRead();
    }
  }
}

/**
 * Concrete Class VolunteerSiteSeparateAuth.
 *
 * @class VolunteerSiteSeparateAuth
 */
class VolunteerSiteSeparateAuth extends VolunteerSite {
  constructor() {
    super();
    this.out_doc_id = null;
  }
  // METHOD: output to Google Doc, for Selenium access
  outputToDoc() {
    // open output doc
    var outdoc_body = DocumentApp.openById(this.out_doc_id).getBody();
    var updated_body_text = outdoc_body.getText();
    // for each message, append volunteer info to the outdoc
    var m = 0;
    for (m = 0; m < this.matches.length; m++) {
      var message = this.matches[m].getMessages()[0];
      this.extractFromMessage(message);
      var keys = Object.keys(this.extraction_dict);
      var k = 0;
      for (k = 0; k < keys.length; k++) {
        updated_body_text += this.site_name + "::>" + 
                             this.values_dict[keys[k]] + "<::\n";
      message.star();
      message.markRead();
      }
    }
    outdoc_body.setText(updated_body_text);
  }
}

/**
 * Concrete Class Idealist.
 *
 * @class Idealist
 */
class Idealist extends VolunteerSiteSeparateAuth {
  constructor(template_doc_id, out_doc_id) {
    super();
    this.subj_search = "You have a new applicant to review on Idealist!";
    this.sender_search = SENDER_TEST //"support@idealist.org";
    this.extraction_dict[this.key_role] = /You can log in to see their information here:\n>\n> (.*)\n/g;
    this.extraction_dict[this.key_name] = /> \[(.*)\]\(/i;
    this.template_doc_id = template_doc_id;
    this.out_doc_id = out_doc_id;
    this.site_name = "Idealist";
  }
}

/**
 * Concrete Class VolunteerMatch.
 *
 * @class VolunteerMatch
 */
class VolunteerMatch extends VolunteerSiteNoSeparateAuth {
  constructor(template_doc_id, out_doc_id) {
    super();
    this.subj_search = "Someone wants to help: ";
    this.sender_search = SENDER_TEST //"noreply@volunteermatch.org";
    this.extraction_dict[this.key_role] = /Title: (.*)\n/g;
    this.extraction_dict[this.key_name] = /Name: (.*)\n/g;
    this.extraction_dict[this.key_email] = /Email: (.*)\n/g;
    this.template_doc_id = template_doc_id;
    this.out_doc_id = out_doc_id;
  }
}

// TEST
function doGet() {
  var ideal = new Idealist(TEMPLATE_ID_TEST, OUTDOC_TEST);
  ideal.getNewMatches();
  ideal.outputToDoc();
  var volmatch = new VolunteerMatch(TEMPLATE_ID_TEST, OUTDOC_TEST);
  volmatch.getNewMatches();
  volmatch.autoReply();
}

doGet();