const test_params = DocumentApp.openById("1iqCTejm6Nb1L-WzUyM30n9zlPYBpQKEEhSscQpmnnbY").
                              getBody().getText();
var email_pattern = /SENDEREMAIL:(.*)\n/g;
var template_pattern = /TEMPLATEID:(.*)\n/g;
var outdoc_pattern = /TEMPDOC:(.*)\n/g;
const TEMPLATE_ID_TEST = template_pattern.exec(test_params)[1];
const SENDER_TEST = email_pattern.exec(test_params)[1];
const TEMPDOC_TEST = outdoc_pattern.exec(test_params)[1];
const RESPONSE_SUBJECT = "Thanks for signing up to volunteer!"

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
    var keys = Object.keys(this.extraction_dict);
    var k = 0;
    for (k = 0; k < keys.length; k++) {
      // find and return a value from the message, based on
      // the substrings that bracket the value
      var search_pattern = this.extraction_dict[keys[k]];
      console.log("Search pattern: " + search_pattern);
      var search_result = search_pattern.exec(message_body);
      console.log("Search result: " + search_result);
      this.values_dict[keys[k]] = search_result[1];
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
  autoReply(subject) {
    // retrieve the template doc based on its ID
    var template = DocumentApp.openById(this.template_doc_id);
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
      console.log("Plain body: " + message.getPlainBody());
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
    console.log("HTML response: " + response_text);
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
    this.sender_search = SENDER_TEST //"support@idealist.org";
    this.extraction_dict[this.key_role] = /You can log in to see their information here:\n>\n> (.*)\n/;
    this.extraction_dict[this.key_name] = /> \[(.*)\]\(/;
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
    this.sender_search = SENDER_TEST //"notification@givepulse.com";
    this.extraction_dict[this.key_role] = /has just registered to \[(.*)\]\(.*\) with \[Asha/i;
    this.extraction_dict[this.key_name] = /> (.*) has just registered to \[/i;
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
    this.sender_search = SENDER_TEST //"noreply@volunteermatch.org";
    this.extraction_dict[this.key_role] = /Title: (.*)\n/;
    this.extraction_dict[this.key_name] = /Name: (.*)\n/;
    this.extraction_dict[this.key_email] = /Email: (.*)\n/;
    this.template_doc_id = template_doc_id;
  }
}

/**
 * Concrete Class Benevity
 *
 * @class Benevity
 */
class Benevity extends VolunteerSiteNoSeparateAuth {
  constructor(template_doc_id) {
    super();
    /*this.subj_search = "";
    this.sender_search = SENDER_TEST //"";
    this.extraction_dict[this.key_role] = /Title: (.*)\n/g;
    this.extraction_dict[this.key_name] = /Name: (.*)\n/g;
    this.extraction_dict[this.key_email] = /Email: (.*)\n/g;
    this.template_doc_id = template_doc_id;*/
  }
}

class SeparateAuthSignup extends AbstractVolunteerSiteProperties {
  constructor(template_doc_id, name, email, role) {
    super();
    this.template_doc_id = template_doc_id;
    this.extraction_dict[this.key_name] = name;
    this.extraction_dict[this.key_email] = email;
    this.extraction_dict[this.key_role] = role;
  }
  // METHOD: send message
  autoReply(subject) {
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
  }
}
