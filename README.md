# Image Upload Gallery with AWS
<img width="787" height="799" alt="image" src="https://github.com/user-attachments/assets/46aa0554-c480-47c3-9c84-d714399fc85c" />

## Live Demo
- The working live site: https://malkiapplebaum.github.io/upload-image/

## GitHub Repository
- Full source code (Lambda, HTML, CSS, JS): https://github.com/MalkiApplebaum/upload-image

## Overview
This project allows users to upload an image, which is then processed by an AWS Lambda function. The Lambda:
- **Uploads** the original image to S3 (`originals/`)
- **Generates** a cropped version (300×300) and also uploads that to S3 (`cropped/`)
- **Returns** URLs for both versions and a gallery of all previously uploaded original images

On the client side, the web app (HTML + CSS + JS):
- Lets users select and upload an image
- Shows the original and cropped images side by side
- Displays a gallery of images uploaded during the current session

## Bonus Feature
I added a "bonus" that stores uploaded image URLs in `sessionStorage`, so the gallery shows only the user's images from that session even after refreshing — unless they upload again, then they see all images.

---


