# Deployment Instructions for Learn.Kiongozi.org

This guide details how to deploy your Kiongozi Web Platform to your Contabo VPS.

## Prerequisites
- SSH Access to your server.
- Supabase URL and Anon Key ready (the script will ask for them).

## 1. Upload the Scripts

Run this command from your **local computer's terminal** (where you have these files) to copy the scripts to your server:

```powershell
# Replace 'afosi' and 'IP_ADDRESS' with your actual username and server IP
scp deploy.sh fix_nginx.sh afosi@YOUR_SERVER_IP:~/
```

## 2. Connect to Your Server

```powershell
ssh afosi@YOUR_SERVER_IP
```

## 3. **Step 1: Cleanup Existing Config**

Before deploying, run this script to safely remove the old `learn.kiongozi.org` entries from your specific Nginx configuration, while keeping `chat` and `admin` running.

```bash
chmod +x fix_nginx.sh
./fix_nginx.sh
```

## 4. **Step 2: Run Deployment**

Now that the config is clean, run the main deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```


Once logged in and the config is cleaned, make the script executable and run it:


```bash
chmod +x deploy.sh
./deploy.sh
```

Follow the prompts on the screen. It will ask for your Supabase credentials to create the `.env.local` file.

## 4. Verification

After the script finishes:
1.  Visit `https://learn.kiongozi.org` in your browser.
2.  Check the status of the app on the server:
    ```bash
    pm2 status
    ```

## 5. Cleaning Up Old Processes (Optional)
If everything works and you want to remove the old, broken `kiongozi-lms` process (ID 6 in your audit):

```bash
pm2 delete 6
pm2 save
```

**Note:** The new deployment runs on port **3010** with the name `kiongozi-web-v2` to avoid conflicting with your existing services.
