import os
from google_auth_oauthlib.flow import InstalledAppFlow

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def main():
    """Shows basic usage of the Drive v3 API.
    Prints the names and ids of the first 10 files the user has access to.
    """
    creds = None
    
    # You need to have downloaded your credentials.json from Google Cloud Console
    # and placed it in the backend/ directory before running this.
    if not os.path.exists('credentials.json'):
        print("Please download credentials.json from Google Cloud Console and place it in the backend/ directory.")
        return

    flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
    # Using a fixed port so the redirect URI is predictable: http://localhost:8080/
    creds = flow.run_local_server(port=8080)
    
    print("\n\n" + "="*50)
    print("Google Drive authentication successful!")
    print("="*50)
    print("\nCopy the following REFRESH TOKEN and add it to your backend/.env file as GOOGLE_REFRESH_TOKEN:\n")
    print(creds.refresh_token)
    print("\n" + "="*50 + "\n")

if __name__ == '__main__':
    main()
