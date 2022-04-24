// Define GET functionality
function doGet(e) {
  var html = HtmlService.createHtmlOutput();
  if(e["parameters"]["func"] == "AutoReplyNoSeparateAuth") {
    var volmatch = new VolunteerMatch(TEMPLATE_ID_TEST);
    volmatch.getNewMatches();
    volmatch.autoReply();
    /*var ben = new Benevity(TEMPLATE_ID_TEST);
    ben.getNewMatches();
    ben.autoReply();*/
    html.append("<p id=\"script_complete\">AutoReplyNoSeparateAuth complete<\p>");
  } else if (e["parameters"]["func"] == "AutoReplySeparateAuth") {
    var ideal = new Idealist(TEMPLATE_ID_TEST, html);
    VolunteerSiteSeparateAuth.initResponseHtml(html);
    ideal.getNewMatches();
    ideal.outputToResponse();
    /*var gp = new GiftPulse(TEMPLATE_ID_TEST, html);
    gp.getNewMatches();
    gp.outputToResponse();
    */
    VolunteerSiteSeparateAuth.finalizeResponseHTML(html);
    html.append("<p id=\"script_complete\">AutoReplySeparateAuth complete<\p>");
  } else {
    html.append("<p id=\"script_complete\">ERROR: NO FUNCTION SELECTED<\p>");
  }
  return html;
}