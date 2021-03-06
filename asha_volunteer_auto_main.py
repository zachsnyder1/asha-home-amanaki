import os, time, re, logging
import urllib.parse as parse
from dotenv import load_dotenv # credentials stored in .env (git ignored)
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

# Parameters set in '.env' file in same directory
GMAIL_UN = 'gmailUserName'
GMAIL_PW = 'gmailPassword'
IDEAL_UN = 'idealistUserName'
IDEAL_PW = 'idealistPassword'
WEBAPP_MAIN_URL = 'webAppUrl'
GIVEP_UN = 'givepulseUserName'
GIVEP_PW = 'givepulsePassword'
# Other global constants
IMPLICIT_WAIT_DURATION = 10
EXPLICIT_WAIT_DURATION = 5
SHORT_EXPLICIT_WAIT = 2
NEW_SIGNUP_REGEX = '(\\w+):\\|\\|VOLUNTEER ROLE\\|\\|=([\\w\\s]+),\\|\\|VOLUNTEER NAME\\|\\|=([\\w\\s]+)'
IDEALIST_URL = "https://www.idealist.org/en/"
GIVEPULSE_URL = "https://www.givepulse.com/"

class NewVolSignup:
  def __init__(self, site, role, name):
    self.site = site
    self.role = role
    self.name = name
    self.email = None

def get_env():
  load_dotenv()
  env = {}
  env[GMAIL_UN] = os.environ.get(GMAIL_UN)
  env[GMAIL_PW] = os.environ.get(GMAIL_PW)
  env[IDEAL_UN] = os.environ.get(IDEAL_UN)
  env[IDEAL_PW] = os.environ.get(IDEAL_PW)
  env[GIVEP_UN] = os.environ.get(GIVEP_UN)
  env[GIVEP_PW] = os.environ.get(GIVEP_PW)
  env[WEBAPP_MAIN_URL] = os.environ.get(WEBAPP_MAIN_URL)
  return env


def gmail_login(driver, username, password):
  # First, enter username
  elem = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.ID, "identifierId"))
  )
  elem.send_keys(username + Keys.ENTER)
  # Next, enter password
  time.sleep(EXPLICIT_WAIT_DURATION)
  elem = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.CLASS_NAME, "zHQkBf"))
  )
  elem.send_keys(password + Keys.ENTER)

def find_script_complete(driver):
  sandboxFrame = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.ID, "sandboxFrame"))
  )
  driver.switch_to.frame(sandboxFrame)
  userHtmlFrame = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.ID, "userHtmlFrame"))
  )
  driver.switch_to.frame(userHtmlFrame)
  elem = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.ID, "script_complete"))
  )
  return elem
  
def idealist_click_manage_listings(driver):
  # go home
  e = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.CLASS_NAME, "PageHeaderDropdownMenu__NavLink-sc-zdvi5-0-g"))
  )
  # locate the account menu
  possible_menus = driver.find_elements(By.XPATH, "//a[contains(@class, 'PageHeaderDropdownMenu__StyledDropdownMenuNav-sc-zdvi5-2')]")
  for menu in possible_menus:
    if "Hi, " in menu.text:
      menu.click()
      break
  time.sleep(SHORT_EXPLICIT_WAIT)
  # locate the Asha Home Amanaki organization link
  dropdown_links = driver.find_elements(By.XPATH, "//a[contains(@class, 'PageHeaderDropdownMenu__NavLink-sc-zdvi5-0-g')]")
  for link in dropdown_links:
    if "Asha Hope Amanaki" in link.text:
      link.click()
      break
  time.sleep(SHORT_EXPLICIT_WAIT)
  # click Manage Listings on side bar
  sidebar_links = driver.find_elements(By.CLASS_NAME, "DashboardSidebarSection__StyledSidebarLink-sc-1b2a90m-1")
  for link in sidebar_links:
    if "Manage Listings" in link.text:
      link.click()
      time.sleep(SHORT_EXPLICIT_WAIT)
      
def click_give_pulse_manage_registrations(driver):
  time.sleep(SHORT_EXPLICIT_WAIT)
  nav = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.ID, "yii_bootstrap_collapse_0"))
  )
  dropdown_links = nav.find_elements(By.XPATH, ".//a")
  for link in dropdown_links:
    if "Manage" in link.text:
      link.click()
  possible_links = nav.find_elements(By.TAG_NAME, "a")
  # click "Registration" link
  for link in possible_links:
    if "Registrations" in link.text:
      link.click()
      break

def idealist_admin_search(driver, search_str):
  # perform admin search for volunteer role
  logging.info("SEARCHING ON IDEALIST: " + search_str)
  admin_search = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.CLASS_NAME, "AdminDashboardSearchInputs__SearchQueryInput-sc-kgj4mt-2"))
  )
  admin_search.clear()
  admin_search.send_keys(search_str + Keys.ENTER)
  admin_search_submit = driver.find_element(By.CLASS_NAME, "AdminDashboardSearchInputs__SearchButton-sc-kgj4mt-3")
  admin_search_submit.click()
  
def is_valid_email(email_str):
  email_regex = re.compile(r'([A-Za-z0-9]+[.-_])*[A-Za-z0-9]+@[A-Za-z0-9-]+(\.[A-Z|a-z]{2,})+')
  return re.fullmatch(email_regex, email_str)

def main():
  env = get_env()
  driver = webdriver.Firefox() # init Selenium
  # ----- VOLUNTEER MATCH -----
  # Send automatic replies to new volunteer signups on
  # volunteer accounts that provide the email in their notification
  driver.get(env[WEBAPP_MAIN_URL] + "?func=AutoReplyNoSeparateAuth")
  try:
    find_script_complete(driver)
    logging.info("SCRIPT COMPLETE LOCATED")
  except:
    logging.info("LOGGING IN TO GMAIL")
    # if Gmail requires auth, handle that
    gmail_login(driver, env[GMAIL_UN], env[GMAIL_PW])
    # Finally, verify that the AutoReplyNoSeparateAuth func completed
    find_script_complete(driver)
  finally:
    logging.info("AutoReplyNoSeparateAuth func completed") 
  # ----- IDEALIST & GIVEPULSE -----
  # Next, run AutoReplySeparateAuth func
  driver.get(env[WEBAPP_MAIN_URL] + "?func=AutoReplySeparateAuth")
  try:
    find_script_complete(driver)
  except:
    logging.info("SCRIPT COMPLETE NOT LOCATED")
    # if Gmail requires auth, handle that
    gmail_login(driver, env[GMAIL_UN], env[GMAIL_PW])
    # Finally, verify that the AutoReplyNoSeparateAuth func completed
    find_script_complete(driver)
  finally:
    logging.info("AutoReplySeparateAuth func completed")
  # AutoReplySeparateAuth - retrieve all new signups
  new_signups_matches = driver.find_elements(By.CLASS_NAME, "volunteer_item")
  idealist_signups = []
  givepulse_signups = []
  for row in new_signups_matches:
    re_match = re.match(NEW_SIGNUP_REGEX, row.text, re.M)
    volunteer = NewVolSignup(re_match.group(1),
                             re_match.group(2),
                             re_match.group(3))
    if volunteer.site == "Idealist":
      idealist_signups.append(volunteer)
    elif volunteer.site == "Givepulse":
      givepulse_signups.append(volunteer)
  # ----- IDEALIST -----
  # AutoReplySeparateAuth - log into Idealist, get all volunteer emails 
  driver.get(IDEALIST_URL)
  login_btn = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.CLASS_NAME, "PageHeader__LoginLink-sc-1ee2g2-1"))
  )
  # login to Idealist
  login_btn.click()
  login_email = driver.find_element(By.ID, "login-form-email")
  login_email.send_keys(env[IDEAL_UN] + Keys.ENTER)
  time.sleep(EXPLICIT_WAIT_DURATION)
  login_pw = driver.find_element(By.ID, "login-form-password")
  login_pw.send_keys(env[IDEAL_PW] + Keys.ENTER)
  time.sleep(EXPLICIT_WAIT_DURATION)
  # for each idealist signup, gather email
  logging.info(str(len(idealist_signups)) + " Idealist signups")
  for signup in idealist_signups:
    idealist_click_manage_listings(driver)
    idealist_admin_search(driver, signup.role)
    # get all listing tiles form inside listing box
    listing_box = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
      EC.presence_of_element_located((By.CLASS_NAME, "ekEDTF"))
    )
    listing_tiles = driver.find_elements(By.CLASS_NAME, "SearchTile-sc-1kv2zmo-2")
    listing_tiles[0].click() # assumes most recent listing!
    time.sleep(SHORT_EXPLICIT_WAIT)
    # in listing, find applicant, click
    applicant_search = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
      EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Search for applicant']"))
    )
    applicant_search.send_keys(signup.name + Keys.ENTER)
    time.sleep(EXPLICIT_WAIT_DURATION)
    possible_links = driver.find_elements(By.CLASS_NAME, "Link__RouterLink-sc-wn2s6u-1")
    # if applicant found, click link
    for link in possible_links:
      if signup.name in link.text:
        link.click()
        break
    # save email and break
    WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
      EC.presence_of_element_located((By.CLASS_NAME, "ViewListingApplicationPage__ResourceLink-sc-1evx30g-6"))
    )
    possible_email_links = driver.find_elements(By.CLASS_NAME, "ViewListingApplicationPage__ResourceLink-sc-1evx30g-6")
    for link in possible_email_links:
      if is_valid_email(link.text):
        signup.email = link.text
      else:
        pass
    if signup.email:
      logging.info("Email found for " + signup.name + ": " + signup.email)
      signup_email_found = True
    else:
      logging.info("ERROR: APPLICANT NOT FOUND --> " + signup.name)
  # ----- IDEALIST -----
  # AutoReplySeparateAuth - auto respond Idealist signups
  for signup in idealist_signups:
    safe_url = env[WEBAPP_MAIN_URL] + "?func=SendAutoReply&site=Idealist&name=" + \
                            parse.quote_plus(signup.name) + "&role=" + \
                            parse.quote_plus(signup.role) + \
                            "&email=" + parse.quote_plus(signup.email)
    driver.get(safe_url)
    find_script_complete(driver)
  # ----- GIVEPULSE -----
  # AutoReplySeparateAuth - log into GivePulse, get all volunteer emails
  driver.get(GIVEPULSE_URL)
  nav = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.ID, "yw0"))
  )
  # find and click Log In button
  nav_btns = nav.find_elements(By.XPATH, ".//a")
  for btn in nav_btns:
    if "Log In" in btn.text:
      btn.click()
  # Login to GivePulse
  email_input = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.ID, "LoginForm_email"))
  )
  email_input.send_keys(env[GIVEP_UN])
  password_input = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.ID, "LoginForm_password"))
  )
  password_input.send_keys(env[GIVEP_PW] + Keys.ENTER)
  # Go to registrations page
  click_give_pulse_manage_registrations(driver)
  # For each new volunteer, find email
  logging.info(str(len(givepulse_signups)) + " GivePulse signups")                             
  for signup in givepulse_signups:
    # refresh manage registrations page
    click_give_pulse_manage_registrations(driver)
    # search for volunteer by name
    filters = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
      EC.presence_of_element_located((By.CLASS_NAME, "filters"))
    )
    name_filter = filters.find_element(By.XPATH, ".//input[@name = 'Registration[user_full_name]']")
    name_filter.send_keys(signup.name + Keys.ENTER)
    # collect email from last (most recent) entry
    time.sleep(SHORT_EXPLICIT_WAIT)
    table = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
      EC.presence_of_element_located((By.XPATH, ".//tbody"))
    )
    table_rows = table.find_elements(By.XPATH, ".//tr")
    table_rows_correct_role = []
    for row in table_rows:
      if signup.role in row.find_element(By.XPATH, ".//td[3]/a").text:
        table_rows_correct_role.append(row)
    # last correct row is most recent (-1 index)
    email = table_rows_correct_role[-1].find_element(By.XPATH, ".//td[5]").text
    signup.email = email
  # ----- GIVEPULSE -----
  # AutoReplySeparateAuth - auto respond GivePulse signups
  for signup in givepulse_signups:
    safe_url = env[WEBAPP_MAIN_URL] + "?func=SendAutoReply&site=Givepulse&name=" + \
                            parse.quote_plus(signup.name) + "&role=" + \
                            parse.quote_plus(signup.role) + \
                            "&email=" + parse.quote_plus(signup.email)
    driver.get(safe_url)
    find_script_complete(driver)
  # END SESSION
  driver.close()
  
if __name__ == "__main__":
  main()
