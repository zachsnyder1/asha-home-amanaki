// Define GET functionality
function doGet(e) {
  var html = HtmlService.createHtmlOutput();
  if(e["parameters"]["func"] == "AutoReplyNoSeparateAuth") {
    var volmatch = new VolunteerMatch(TEMPLATE_ID_TEST);
    volmatch.getNewMatches();
    volmatch.autoReply(RESPONSE_SUBJECT);
    /*var ben = new Benevity(TEMPLATE_ID_TEST);
    ben.getNewMatches();
    ben.autoReply(RESPONSE_SUBJECT);*/
    html.append("<p id=\"script_complete\">AutoReplyNoSeparateAuth complete<\p>");
  } else if (e["parameters"]["func"] == "AutoReplySeparateAuth") {
    var ideal = new Idealist(TEMPLATE_ID_TEST, html);
    VolunteerSiteSeparateAuth.initResponseHtml(html);
    ideal.getNewMatches();
    ideal.outputToResponse();
    var gp = new GivePulse(TEMPLATE_ID_TEST, html);
    gp.getNewMatches();
    gp.outputToResponse();
    VolunteerSiteSeparateAuth.finalizeResponseHTML(html);
    html.append("<p id=\"script_complete\">AutoReplySeparateAuth complete<\p>");
  } else if (e["parameters"]["func"] == "SendAutoReply") {
    // get parameters from POST query string
    var signup_email = e["parameters"]["email"];
    var signup_name = e["parameters"]["name"];
    var signup_role = e["parameters"]["role"];
    var signup_site = e["parameters"]["site"];
    // throw error if not all parameters are correct
    if(!(signup_email && signup_name && signup_role && signup_site)) {
      html.append("<p id=\"script_complete\">ERROR: INCORRECT QUERY PARAMATERS<\p>");
      return html;
    }
    // based on 'site' parameter, handle auto response
    if(signup_site=="Idealist") {
      var ideal = new SeparateAuthSignup(TEMPLATE_ID_TEST, signup_name, signup_email, signup_role);
      ideal.autoReply(RESPONSE_SUBJECT); // change to correct template id
      html.append("<p id=\"script_complete\">POST:" + signup_name + "<\p>");
    } else if (signup_site=="Givepulse") {
      var gp = new SeparateAuthSignup(TEMPLATE_ID_TEST, signup_name, signup_email, signup_role);
      gp.autoReply(RESPONSE_SUBJECT); // change to correct template id
      html.append("<p id=\"script_complete\">AUTO REPLY SENT TO:" + signup_name + "<\p>");
    } else {
      html.append("<p id=\"script_complete\">ERROR: INCORRECT SITE PARAMATER<\p>");
      return html;
    }
  } else {
    html.append("<p id=\"script_complete\">ERROR: NO FUNCTION SELECTED<\p>");
  }
  return html;
}
