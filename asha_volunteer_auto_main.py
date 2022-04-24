import os, time
from dotenv import load_dotenv # credentials stored in .env (git ignored)
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

WEBAPP_MAIN_URL = "https://script.google.com/macros/s/AKfycbysn-TS-EXFHlp32sRriw8nTsoUxWNP3oG9xngaqOy-8kEyYyQQTMv6Zpns7rM5vKOW5w/exec"
IMPLICIT_WAIT_DURATION = 5

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

def main():
  load_dotenv()
  gmail_un = os.environ.get('gmailUserName')
  gmail_pw = os.environ.get('gmailPassword')

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
    
  # END SESSION
  #driver.close()
    
  
if __name__ == "__main__":
  main()
