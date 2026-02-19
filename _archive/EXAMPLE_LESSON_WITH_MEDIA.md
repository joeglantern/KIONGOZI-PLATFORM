# Example Lesson: Combining Text and Media

## How It Works

When you create a lesson in the Kiongozi LMS, you can seamlessly combine **long-form text** with **video and audio media**. The platform automatically:

1. **Detects media** in your markdown content
2. **Renders video/audio players** with accessibility features
3. **Wraps text** in reading tools (font size, dark mode, progress tracking)
4. **Provides inclusive experience** for all learners

---

## Example Lesson Structure

Below is an example of what a real lesson looks like with both text and media:

```markdown
# Introduction to Solar Energy

## What is Solar Energy?

Solar energy is radiant light and heat from the Sun that is harnessed using a range of technologies such as solar power to generate electricity, solar thermal energy, and solar architecture. It is an essential source of renewable energy, and its technologies are broadly characterized as either passive solar or active solar depending on how they capture and distribute solar energy.

### Watch: How Solar Panels Work

![Video](https://example.com/videos/solar-panels-explained.mp4)

**Video Duration:** 12 minutes
**Accessibility:** Closed captions available, full transcript below

---

## The Science Behind Photovoltaic Cells

When sunlight hits a solar panel, photons from the light are absorbed by the cells in the panel, which are made of semiconducting materials such as silicon. This creates an electric field across the layers and causes electricity to flow. The more light that hits a cell, the more electricity it produces.

### Key Components:

1. **Photovoltaic (PV) cells** - Convert sunlight to electricity
2. **Inverter** - Converts DC power to AC power
3. **Mounting structure** - Holds panels in place
4. **Battery storage** (optional) - Stores excess energy

### Listen: Interview with Solar Engineer

![Audio](https://example.com/audio/solar-engineer-interview.mp3)

**Duration:** 20 minutes
**Guest:** Dr. Sarah Chen, Solar Energy Researcher

In this audio interview, Dr. Chen discusses the latest innovations in photovoltaic technology and what the future holds for solar energy adoption.

---

## Environmental Impact

Solar energy is one of the cleanest sources of power available. Unlike fossil fuels, solar panels:

- ✅ Produce **zero emissions** during operation
- ✅ Require **minimal water** for maintenance
- ✅ Have a **25-30 year lifespan**
- ✅ Are **recyclable** at end of life

### Carbon Offset Calculator

A typical residential solar system (6 kW) offsets approximately:
- **7,000 kg of CO2** per year
- Equivalent to planting **170 trees**
- Or taking **1.5 cars off the road**

### Watch: Solar Installation Process

![Video](https://example.com/videos/installation-process.mp4)

**Video Duration:** 8 minutes
**Includes:** Step-by-step installation, safety tips, best practices

---

## Cost and ROI

The cost of solar panels has decreased by over 70% in the past decade, making it more accessible than ever. Here's a breakdown:

| Component | Average Cost | Lifespan |
|-----------|-------------|----------|
| Solar Panels | $3,000-$5,000 | 25-30 years |
| Inverter | $1,000-$2,000 | 10-15 years |
| Installation | $2,000-$4,000 | One-time |
| **Total System** | **$6,000-$11,000** | **25-30 years** |

### Return on Investment

Most homeowners see a full return on investment within **7-10 years**, after which the electricity generated is essentially free for the remaining 15-20 years of the panel's life.

---

## Quiz: Test Your Knowledge

1. What material are most solar cells made from?
   - a) Copper
   - b) Silicon ✅
   - c) Aluminum
   - d) Gold

2. How long do solar panels typically last?
   - a) 5-10 years
   - b) 10-15 years
   - c) 25-30 years ✅
   - d) 50+ years

3. What does an inverter do?
   - a) Stores electricity
   - b) Converts DC to AC ✅
   - c) Cleans the panels
   - d) Measures sunlight

---

## Additional Resources

- 📚 [Solar Energy International](https://www.solarenergy.org)
- 🎓 [MIT OpenCourseWare: Solar Energy](https://ocw.mit.edu)
- 🔧 [DIY Solar Installation Guide](https://example.com/diy-guide)

---

## Next Steps

Great job completing this lesson! You've learned:
- ✅ How solar panels convert sunlight to electricity
- ✅ The environmental benefits of solar energy
- ✅ Cost considerations and ROI expectations
- ✅ The installation process

**Next Lesson:** Wind Energy Fundamentals →
```

---

## What Happens When This Renders

When a student views this lesson, the platform automatically:

### 1. **Text Content**
All text paragraphs, lists, tables, and headings are wrapped in the **ReadingProgress** component, providing:
- 📖 Reading progress bar at the top
- 🔤 Font size adjustment (A- / A+)
- 🌙 Dark mode toggle
- ⏱️ Reading time estimate
- 📊 Scroll progress indicator

### 2. **Video Content**
When markdown contains `![Video](url)`, the **MediaPlayer** component renders with:
- ▶️ Play/pause controls
- ⏪⏩ Skip backward/forward 10 seconds
- 🔊 Volume control
- ⚡ Speed adjustment (0.5x - 2x)
- 📝 Subtitle overlays (if provided)
- 📄 Transcript panel (expandable)
- ⌨️ Keyboard shortcuts (Space = play/pause)

### 3. **Audio Content**
When markdown contains `![Audio](url)`, the **MediaPlayer** renders as an audio player with:
- 🎧 Beautiful gradient background
- All the same controls as video
- 📝 Full transcript support
- ♿ ARIA labels for screen readers

### 4. **Combined Experience**
Students can:
- Read text at their preferred font size
- Watch videos with captions
- Listen to audio at their preferred speed
- Toggle dark mode for reduced eye strain
- Track their reading progress
- Use keyboard for navigation
- Access transcripts for all media

---

## How to Create This Content

### In the Database

When creating a module in the `learning_modules` table:

```sql
INSERT INTO learning_modules (title, content, estimated_duration_minutes, difficulty_level)
VALUES (
  'Introduction to Solar Energy',
  '# Introduction to Solar Energy

## What is Solar Energy?

Solar energy is radiant light and heat from the Sun...

### Watch: How Solar Panels Work

![Video](https://example.com/videos/solar-panels-explained.mp4)

...rest of the markdown content...',
  45,
  'beginner'
);
```

### Media URL Detection

The platform automatically detects media by:
1. **Alt text keywords**: `![Video]` or `![Audio]` in the alt text
2. **File extensions**: `.mp4`, `.webm`, `.mp3`, `.wav`, etc.

### Adding Transcripts

For maximum accessibility, you can provide transcripts in the markdown:

```markdown
### Watch: Introduction Video

![Video](https://example.com/video.mp4)

#### 📝 Video Transcript

**[00:00]** Welcome to this lesson on solar energy.

**[00:25]** Today we'll explore how photovoltaic cells work...

**[02:15]** Let's look at a real-world installation...
```

The transcript will be displayed in an expandable panel below the video player.

---

## Accessibility Features

### For Visual Disabilities
- ✅ Screen reader support (ARIA labels)
- ✅ Keyboard navigation
- ✅ Text transcripts for all videos
- ✅ Adjustable font size (14-24px)
- ✅ High contrast mode

### For Hearing Disabilities
- ✅ Closed captions on videos
- ✅ Full text transcripts
- ✅ Visual indicators for audio content
- ✅ Written alternatives to audio lessons

### For Cognitive Disabilities
- ✅ Progress indicators
- ✅ Chunked content
- ✅ Skip controls
- ✅ Reading time estimates
- ✅ Playback speed control (0.5x - 2x)

### For Motor Disabilities
- ✅ Keyboard-only navigation
- ✅ Large click targets
- ✅ No time limits
- ✅ Sticky controls

---

## Best Practices

### 1. **Balance Text and Media**
- Use video for demonstrations and visual concepts
- Use audio for interviews and discussions
- Use text for detailed explanations and reference material

### 2. **Structure Content Logically**
```
Introduction (text)
  ↓
Visual Explanation (video)
  ↓
Detailed Analysis (text)
  ↓
Expert Interview (audio)
  ↓
Summary (text)
```

### 3. **Provide Multiple Formats**
Offer the same content in different formats when possible:
- 📹 Video demonstration
- 🎧 Audio version (for commuters)
- 📖 Written guide (for quick reference)

### 4. **Keep Media Concise**
- Videos: 5-15 minutes maximum
- Audio: 10-20 minutes maximum
- Text sections: 500-1000 words between media

### 5. **Always Include Accessibility**
- Every video needs captions
- Every audio needs a transcript
- Every image needs alt text
- All interactive elements need keyboard support

---

## Example: Multi-Format Lesson

```markdown
# Understanding Climate Change

## Choose Your Learning Format

**📹 Watch the Video** (15 min) - Visual learners, see animated data
**🎧 Listen to Audio** (15 min) - Perfect for commuters
**📖 Read the Article** (10 min) - Quick reference, searchable

---

### Video Version

![Video](https://example.com/climate-change-explained.mp4)

**Includes:**
- Animated temperature graphs
- Satellite imagery of ice melts
- Visualizations of CO2 levels
- Expert interviews

---

### Audio Version

![Audio](https://example.com/climate-change-audio.mp3)

**Perfect for:**
- Listening while commuting
- Multitasking learners
- Those who prefer auditory learning

---

### Written Article

Climate change refers to long-term shifts in temperatures and weather patterns...

[Full text content continues...]
```

---

## Testing Your Lesson

Before publishing, verify:
- [ ] All media URLs are valid and accessible
- [ ] Videos have captions or transcripts
- [ ] Audio has transcripts
- [ ] Text is readable at different font sizes
- [ ] Dark mode works correctly
- [ ] Keyboard navigation functions
- [ ] Mobile layout is responsive
- [ ] Reading time is accurate

---

## Summary

The Kiongozi LMS provides a **world-class inclusive learning experience** by:

1. ✅ Automatically detecting media in markdown
2. ✅ Rendering accessible video/audio players
3. ✅ Providing reading tools for text content
4. ✅ Supporting keyboard navigation
5. ✅ Offering transcripts and captions
6. ✅ Enabling customization (font size, dark mode, playback speed)

**Every learner**, regardless of ability or preference, can access and engage with your content! 🌍♿✨
