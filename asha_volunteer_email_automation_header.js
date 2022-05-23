/**
 * Load script parameters from separate Google doc
 */
const param_file = DocumentApp.openById("1iqCTejm6Nb1L-WzUyM30n9zlPYBpQKEEhSscQpmnnbY").
                                        getBody().getText();
//var forward_email = /FORWARD_EMAIL:(.*)\n/i;
var log_sheet_id = /LOG_SHEET_ID:(.*)\n/i;
var template_id_volmatch = /TEMPLATE_ID_VOLUNTEER_MATCH:(.*)\n/i;
var template_id_idealist = /TEMPLATE_ID_IDEALIST:(.*)\n/i;
var template_id_givepulse = /TEMPLATE_ID_GIVEPULSE:(.*)\n/i;
var response_subj_id_volmatch = /RESPONSE_SUBJECT_DOC_ID_VOLMATCH:(.*)\n/i;
var response_subj_id_idealist = /RESPONSE_SUBJECT_DOC_ID_IDEALIST:(.*)\n/i;
var response_subj_id_givepulse = /RESPONSE_SUBJECT_DOC_ID_GIVEPULSE:(.*)\n/i;
//const FORWARD_EMAIL = forward_email.exec(param_file)[1];
const LOG_SHEET_ID = log_sheet_id.exec(param_file)[1];
const TEMPLATE_ID_VOLMATCH = template_id_volmatch.exec(param_file)[1];
const TEMPLATE_ID_IDEALIST = template_id_idealist.exec(param_file)[1];
const TEMPLATE_ID_GIVEPULSE = template_id_givepulse.exec(param_file)[1];
const SUBJECT_ID_VOLMATCH = response_subj_id_volmatch.exec(param_file)[1];
const SUBJECT_ID_IDEALIST = response_subj_id_idealist.exec(param_file)[1];
const SUBJECT_ID_GIVEPULSE = response_subj_id_givepulse.exec(param_file)[1];

/**
 * Abstract Class AbstractVolunteerSiteProperties
 *
 * @class AbstractVolunteerSiteProperties
 */
class AbstractVolunteerSiteProperties {
  constructor() {
    this.key_role = "||VOLUNTEER ROLE||";
    this.key_name = "||VOLUNTEER NAME||";
    this.key_email = "||VOLUNTEER EMAIL||";
    this.extraction_dict = {};
    this.values_dict = {};
  }
  // METHOD: log email auto response event in log spreadsheet
  logAutoResponse(log_sheet, params) {
    var sheet = log_sheet.getSheets()[0]; // get first sheet on document
    var last_row = log_sheet.getLastRow(); // find the last row with content
    log_sheet.insertRowAfter(last_row); // add new log row to sheet
    var cell_range = sheet.getRange(last_row+1, 1, 1, params.length+1);
    // get date + time
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = [(date+' '+time)];
    // set cell values
    cell_range.setValues([dateTime.concat(params)]);
    SpreadsheetApp.flush();
  }
}

/**
 * Abstract Class VolunteerSite
 *
 * @class VolunteerSite
 */
class VolunteerSite extends AbstractVolunteerSiteProperties {
  // set template tag constants (also used in extraction dictionaries as keys)
  constructor() {
    super();
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
  extractFromMessage(message_body) {
    console.log(message_body);
    var keys = Object.keys(this.extraction_dict);
    var k = 0;
    for (k = 0; k < keys.length; k++) {
      // find and return a value from the message, based on
      // the substrings that bracket the value
      var search_pattern = this.extraction_dict[keys[k]];
      var search_result = search_pattern.exec(message_body);
      this.values_dict[keys[k]] = search_result[1];
      console.log("Found param: " + search_result[1]);
    }
  }
}

/**
 * Concrete Class VolunteerSiteNoSeparateAuth
 *
 * @class VolunteerSiteNoSeparateAuth
 */
class VolunteerSiteNoSeparateAuth extends VolunteerSite {
  constructor() {
    super();
  }
  // METHOD: Auto-reply to matched messages
  autoReply(subject_doc_id, log_sheet) {
    // retrieve the template doc based on its ID
    var template = DocumentApp.openById(this.template_doc_id);
    var subject_doc = DocumentApp.openById(subject_doc_id);
    var subject = subject_doc.getBody().getText()
    // for each message, perform all replacements in replacement dict
    var m = 0;
    for (m = 0; m < this.matches.length; m++) {
      var message = this.matches[m].getMessages()[0];
      message.star();
      this.matches[m].markRead();
      this.extractFromMessage(message.getPlainBody());
      // load the template text
      var response_body = template.getBody().getText();
      // perform replacement of the template tags
      var keys = Object.keys(this.extraction_dict);
      var k = 0;
      for (k = 0; k < keys.length; k++) {
        response_body = response_body.replaceAll(keys[k], this.values_dict[keys[k]]);
      }
      var auto_email_to_volunteer = GmailApp.createDraft(this.values_dict[this.key_email],
                                                         subject,
                                                         response_body);
      auto_email_to_volunteer.send();
      // Add to log
      var log_params = [
            this.site_name,
            this.values_dict[this.key_name],
            this.values_dict[this.key_email],
            this.values_dict[this.key_role],
            this.template_doc_id,
            subject_doc_id
      ];
      this.logAutoResponse(log_sheet, log_params);
    }
  }
}

/**
 * Concrete Class VolunteerSiteSeparateAuth
 *
 * @class VolunteerSiteSeparateAuth
 */
class VolunteerSiteSeparateAuth extends VolunteerSite {
  constructor() {
    super();
    this.out_doc_id = null;
    this.html_response = null;
  }
  // METHOD: start a "volunteer signups" div in the
  // provided HTML response
  static initResponseHtml(html) {
    html.append("<div id=\"volunteer_signups\">");
  }
  // METHOD: finish a "volunteer signups" div in the
  // provided HTML response
  static finalizeResponseHTML(html) {
    html.append("</div>");
  }
  // METHOD: append to HTML object, for Selenium access
  outputToResponse() {
    // for each message, append volunteer info to the HTML obj
    var response_text = "";
    var m = 0;
    for (m = 0; m < this.matches.length; m++) {
      var message = this.matches[m].getMessages()[0];
      message.star();
      this.matches[m].markRead();
      this.extractFromMessage(message.getPlainBody());
      var keys = Object.keys(this.extraction_dict);
      var k = 0;
      // volunteer entries in HTML response are wrapped in <p> w/ id
      response_text += "<p class=\"volunteer_item\">" + this.site_name + ":";
      for (k = 0; k < keys.length; k++) {
        response_text += keys[k] + "=" + this.values_dict[keys[k]];
        if((k+1) != keys.length) {
          response_text += ",";
        }
      }
      response_text += "</p>";
    }
    this.html_response.append(response_text);
  }
}

/**
 * Concrete Class Idealist
 *
 * @class Idealist
 */
class Idealist extends VolunteerSiteSeparateAuth {
  constructor(template_doc_id, html) {
    super();
    this.subj_search = "You have a new applicant to review on Idealist!";
    this.sender_search = "support@idealist.org";
    this.extraction_dict[this.key_role] = /You can log in to see their information here:[\s>]+(\w[\w ]+)(?:\r\n|\r|\n)/;
    this.extraction_dict[this.key_name] = /information here:[\s>]+(?:\w[\w ]+)[\s>]+\[(\w[\w ]+)\]\(/;
    this.template_doc_id = template_doc_id;
    this.html_response = html;
    this.site_name = "Idealist";
  }
}

/**
 * Concrete Class GivePulse
 *
 * @class GivePulse
 */
class GivePulse extends VolunteerSiteSeparateAuth {
  constructor(template_doc_id, html) {
    super();
    this.subj_search = "updated registration for";
    this.sender_search = "notification@givepulse.com";
    this.extraction_dict[this.key_role] = /has just registered to \[(.*)\]\(.*\) with \[Asha/i;
    this.extraction_dict[this.key_name] = /(?:> |\s+)([A-z][A-z ]+) has just registered to \[/i;
    this.template_doc_id = template_doc_id;
    this.html_response = html;
    this.site_name = "Givepulse";
  }
}

/**
 * Concrete Class VolunteerMatch
 *
 * @class VolunteerMatch
 */
class VolunteerMatch extends VolunteerSiteNoSeparateAuth {
  constructor(template_doc_id) {
    super();
    this.subj_search = "Someone wants to help: ";
    this.sender_search = "noreply@volunteermatch.org";
    this.extraction_dict[this.key_role] = /Title: (\w[\w ]+)[\s>]+/;
    this.extraction_dict[this.key_name] = /Name: (\w[\w ]+)[\s>]+/;
    this.extraction_dict[this.key_email] = /Email: (\w.+)[\s>]+/;
    this.template_doc_id = template_doc_id;
    this.site_name = "Volunteer Match"
  }
}

class SeparateAuthSignup extends AbstractVolunteerSiteProperties {
  constructor(template_doc_id, name, email, role, site_name) {
    super();
    this.template_doc_id = template_doc_id;
    this.extraction_dict[this.key_name] = name;
    this.extraction_dict[this.key_email] = email;
    this.extraction_dict[this.key_role] = role;
    this.site_name = site_name;
  }
  // METHOD: send message
  autoReply(subject_doc_id, log_sheet) {
    // get email subject from document
    var subject_doc = DocumentApp.openById(subject_doc_id);
    var subject = subject_doc.getBody().getText()
    // retrieve the template doc based on its ID
    var template = DocumentApp.openById(this.template_doc_id);
    var response_body = template.getBody().getText();
    // perform replacement of the template tags
    var keys = Object.keys(this.extraction_dict);
    var k = 0;
    for (k = 0; k < keys.length; k++) {
      response_body = response_body.replaceAll(keys[k], this.extraction_dict[keys[k]]);
    }
    var auto_email_to_volunteer = GmailApp.createDraft(this.extraction_dict[this.key_email],
                                                       subject,
                                                       response_body);
    auto_email_to_volunteer.send();
    // Add to log
    var log_params = [
            this.site_name,
            this.extraction_dict[this.key_name],
            this.extraction_dict[this.key_email],
            this.extraction_dict[this.key_role],
            this.template_doc_id,
            subject_doc_id
      ];
      this.logAutoResponse(log_sheet, log_params);
  }
}
