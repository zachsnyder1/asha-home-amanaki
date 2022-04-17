const test_params = DocumentApp.openById("1iqCTejm6Nb1L-WzUyM30n9zlPYBpQKEEhSscQpmnnbY").
                              getBody().getText();
var outdoc_pattern = /TEMPDOC:(.*)\n/g;
const TEMPDOC_TEST = outdoc_pattern.exec(test_params)[1];

function doGet() {
  var outdoc = DocumentApp.openById(TEMPDOC_TEST).getBody();
  outdoc.setText("");
}