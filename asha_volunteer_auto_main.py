import os, time, re
import urllib.parse as parse
from dotenv import load_dotenv # credentials stored in .env (git ignored)
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

WEBAPP_MAIN_URL = "https://script.google.com/macros/s/AKfycbxpstvpuu04GVGWjbzqqhTevZZAO-BAf4dMg45bXsWMQcZluwWieaT6s07AVbHKXjFVug/exec"
IMPLICIT_WAIT_DURATION = 5
NEW_SIGNUP_REGEX = '(\\w+):\\|\\|VOLUNTEER ROLE\\|\\|=([\\w\\s]+),\\|\\|VOLUNTEER NAME\\|\\|=([\\w\\s]+)'
IDEALIST_URL = "https://www.idealist.org/en/"
GIVEPULSE_URL = "https://www.givepulse.com/"

class NewVolSignup:
  def __init__(self, site, role, name):
    self.site = site
    self.role = role
    self.name = name
    self.email = None

def gmail_login(driver, gmail_un, gmail_pw):
  # First, enter username
  elem = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.ID, "identifierId"))
  )
  elem.send_keys(gmail_un + Keys.ENTER)
  # Next, enter password
  time.sleep(IMPLICIT_WAIT_DURATION)
  elem = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.CLASS_NAME, "zHQkBf"))
  )
  elem.send_keys(gmail_pw + Keys.ENTER)

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
  time.sleep(1)
  # locate the Asha Home Amanaki organization link
  dropdown_links = driver.find_elements(By.XPATH, "//a[contains(@class, 'PageHeaderDropdownMenu__NavLink-sc-zdvi5-0-g')]")
  for link in dropdown_links:
    if "Asha Hope Amanaki" in link.text:
      link.click()
      break
  time.sleep(3)
  # click Manage Listings on side bar
  sidebar_links = driver.find_elements(By.CLASS_NAME, "DashboardSidebarSection__StyledSidebarLink-sc-1b2a90m-1")
  for link in sidebar_links:
    if "Manage Listings" in link.text:
      link.click()
      time.sleep(3)

def idealist_admin_search(driver, search_str):
  # perform admin search for volunteer role
  print("SEARCHING ON IDEALIST: " + search_str)
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
  load_dotenv()
  gmail_un = os.environ.get('gmailUserName')
  gmail_pw = os.environ.get('gmailPassword')
  ideal_un = os.environ.get('idealistUserName')
  ideal_pw = os.environ.get('idealistPassword')
  
  driver = webdriver.Firefox() # init Selenium
  # Send automatic replies to new volunteer signups on
  # volunteer accounts that provide the email in their notification
  driver.get(WEBAPP_MAIN_URL + "?func=AutoReplyNoSeparateAuth")
  try:
    find_script_complete(driver)
    print("SCRIPT COMPLETE LOCATED")
  except:
    print("LOGGING IN TO GMAIL")
    # if Gmail requires auth, handle that
    gmail_login(driver, gmail_un, gmail_pw)
    # Finally, verify that the AutoReplyNoSeparateAuth func completed
    find_script_complete(driver)
  finally:
    print("AutoReplyNoSeparateAuth func completed")
  # Next, run AutoReplySeparateAuth func
  driver.get(WEBAPP_MAIN_URL + "?func=AutoReplySeparateAuth")
  try:
    find_script_complete(driver)
  except:
    print("SCRIPT COMPLETE NOT LOCATED")
    # if Gmail requires auth, handle that
    gmail_login(gmail_un, gmail_pw)
    # Finally, verify that the AutoReplyNoSeparateAuth func completed
    find_script_complete(driver)
  finally:
    print("AutoReplySeparateAuth func completed")
    elem = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
      EC.presence_of_element_located((By.ID, "volunteer_signups"))
    )
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
  
  # AutoReplySeparateAuth - log into Idealist, handle all 
  driver.get(IDEALIST_URL)
  login_btn = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
    EC.presence_of_element_located((By.CLASS_NAME, "PageHeader__LoginLink-sc-1ee2g2-1"))
  )
  # login to Idealist
  login_btn.click()
  login_email = driver.find_element(By.ID, "login-form-email")
  login_email.send_keys(ideal_un + Keys.ENTER)
  time.sleep(3)
  login_pw = driver.find_element(By.ID, "login-form-password")
  login_pw.send_keys(ideal_pw + Keys.ENTER)
  time.sleep(3)
  # for each idealist signup, gather email
  print(str(len(idealist_signups)) + " Idealist signups")
  for signup in idealist_signups:
    idealist_click_manage_listings(driver)
    idealist_admin_search(driver, signup.role)
    # get all listing tiles form inside listing box
    listing_box = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
      EC.presence_of_element_located((By.CLASS_NAME, "ekEDTF"))
    )
    listing_tiles = driver.find_elements(By.CLASS_NAME, "SearchTile-sc-1kv2zmo-2")
    listing_tiles[0].click() # assumes most recent listing!
    time.sleep(3)
    # in listing, find applicant, click
    applicant_search = WebDriverWait(driver, IMPLICIT_WAIT_DURATION).until(
      EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Search for applicant']"))
    )
    applicant_search.send_keys(signup.name + Keys.ENTER)
    time.sleep(1)
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
      print("Email found for " + signup.name + ": " + signup.email)
      signup_email_found = True
    else:
      print("ERROR: APPLICANT NOT FOUND --> " + signup.name)
  # AutoReplySeparateAuth - auto respond Idealist signups
  for signup in idealist_signups:
    safe_url = WEBAPP_MAIN_URL + "?func=SendAutoReply&site=Idealist&name=" + \
                            parse.quote_plus(signup.name) + "&role=" + \
                            parse.quote_plus(signup.role) + \
                            "&email=" + parse.quote_plus(signup.email)
    driver.get(safe_url)
    find_script_complete(driver)
  #click into role listing
  # END SESSION
  driver.close()
  
if __name__ == "__main__":
  main()
