<template>
  <img :src="url" alt="" />
</template>

<script>
export default {
  name: 'Home',
  data: () => ({
    url: ''
  }),
  mounted() {
    const CloudFrontUrl = 'https://d1b892w88fzt8v.cloudfront.net'
    const imageRequest = JSON.stringify({
      bucket: 'wolfproductions.photos',
      key: 'WolfProductions/2022-05-21 - Bandjes Oerknal/blue_king-044.jpg',
      edits: {
        resize: {
          width: 300
        }
      }
    })
    this.url = `${CloudFrontUrl}/${btoa(imageRequest)}`
  }
}
</script>
